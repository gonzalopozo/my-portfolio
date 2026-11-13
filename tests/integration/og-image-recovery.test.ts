import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { openDatabase } from '../../db/client';
import { eq } from 'drizzle-orm';
import { temporaryDatabase } from '../fixtures/database';
import { projects, projectImageOperations as operations } from '../../db/schema';

const context = vi.hoisted(() => ({
	db: undefined as unknown as ReturnType<typeof openDatabase>['db'],
	del: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/db', () => ({
	get db() {
		return context.db;
	},
}));
vi.mock('@/lib/blob', () => ({ del: context.del }));
import {
	cleanupImageOperation,
	persistProjectImage,
	prepareImageUpload,
	reconcileProjectImages,
	recordImageCleanup,
} from '@/lib/og-image/store';
import { ImageBudget } from '@/lib/og-image/budget';

const origin = 'https://store.public.blob.vercel-storage.com';
const previous = `${origin}/og-images/1-100.png`;
const source = 'https://example.com/project';
let fixture: Awaited<ReturnType<typeof temporaryDatabase>>;
beforeEach(async () => {
	fixture = await temporaryDatabase();
	context.db = fixture.db;
	context.del.mockReset().mockResolvedValue(undefined);
	vi.stubEnv('VERCEL_ENV', undefined);
	vi.stubEnv('BLOB_PUBLIC_HOSTNAME', origin);
	await fixture.db
		.update(projects)
		.set({ url: source, ogImageUrl: previous })
		.where(eq(projects.id, 1));
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.useRealTimers();
	await fixture.close();
});
const prepare = () => prepareImageUpload(1, 'png', previous, new ImageBudget());
const state = async (id: string) =>
	(await fixture.db.select().from(operations).where(eq(operations.id, id)))[0];

describe('durable image state transitions', () => {
	it('commits the new reference before cleaning the previous image', async () => {
		const operation = await prepare();
		context.del.mockImplementation(async () => {
			expect((await fixture.db.select().from(projects))[0].ogImageUrl).toBe(
				operation.candidateUrl,
			);
		});
		expect(await persistProjectImage(operation.id, source, new ImageBudget())).toEqual({
			ok: true,
		});
		expect(context.del).toHaveBeenCalledWith(
			previous,
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
		expect((await state(operation.id)).state).toBe('complete');
	});
	it('recognizes a committed write whose response was lost', async () => {
		const operation = await prepare();
		const transaction = fixture.db.transaction.bind(fixture.db);
		vi.spyOn(fixture.db, 'transaction').mockImplementationOnce(async (...args) => {
			await transaction(...args);
			throw new Error('response lost');
		});
		expect(await persistProjectImage(operation.id, source, new ImageBudget())).toEqual({
			ok: true,
		});
		expect(context.del).not.toHaveBeenCalledWith(operation.candidateUrl, expect.anything());
	});
	it('never deletes a candidate when a timed-out transaction eventually commits', async () => {
		const operation = await prepare();
		const transaction = fixture.db.transaction.bind(fixture.db);
		const gate = Promise.withResolvers<void>();
		let lateCommit: Promise<unknown> | undefined;
		vi.spyOn(fixture.db, 'transaction').mockImplementationOnce((...args) => {
			lateCommit = gate.promise.then(() => transaction(...args));
			return lateCommit;
		});
		vi.useFakeTimers();
		const pending = persistProjectImage(operation.id, source, new ImageBudget());
		await vi.advanceTimersByTimeAsync(3000);
		expect(await pending).toMatchObject({
			ok: false,
			error: { code: 'persistence-uncertain' },
		});
		expect(context.del).not.toHaveBeenCalled();
		vi.useRealTimers();
		gate.resolve();
		await lateCommit;
		expect((await fixture.db.select().from(projects))[0].ogImageUrl).toBe(
			operation.candidateUrl,
		);
		await reconcileProjectImages();
		expect(context.del).not.toHaveBeenCalledWith(operation.candidateUrl, expect.anything());
	});
	it('leaves an uncommitted write pending for daily recovery', async () => {
		const operation = await prepare();
		vi.spyOn(fixture.db, 'transaction').mockRejectedValueOnce(new Error('connection lost'));
		expect(await persistProjectImage(operation.id, source, new ImageBudget())).toMatchObject({
			ok: false,
			error: { code: 'persistence-uncertain' },
		});
		expect((await state(operation.id)).state).toBe('pending');
		expect(context.del).not.toHaveBeenCalled();
	});
	it('retains candidates when persistence and reconciliation reads fail', async () => {
		const operation = await prepare();
		vi.spyOn(fixture.db, 'transaction').mockRejectedValueOnce(new Error('unavailable'));
		const select = vi.spyOn(fixture.db, 'select').mockImplementationOnce(() => {
			throw new Error('unavailable');
		});
		expect(await persistProjectImage(operation.id, source, new ImageBudget())).toMatchObject({
			ok: false,
			error: { code: 'persistence-uncertain' },
		});
		expect(context.del).not.toHaveBeenCalled();
		select.mockRestore();
		expect((await state(operation.id)).state).toBe('pending');
	});
	it('keeps a confirmed CAS conflict distinct from an uncertain write', async () => {
		const operation = await prepare();
		await fixture.db.update(projects).set({ url: 'https://example.com/new' });
		expect(await persistProjectImage(operation.id, source, new ImageBudget())).toMatchObject({
			ok: false,
			error: { code: 'persist-failed' },
		});
		expect((await state(operation.id)).state).toBe('abandoned');
		await reconcileProjectImages();
		expect(context.del).toHaveBeenCalledWith(operation.candidateUrl, expect.anything());
		expect(context.del).not.toHaveBeenCalledWith(previous, expect.anything());
	});
	it('fences old pending operations before a late foreground request can persist them', async () => {
		const operation = await prepare();
		await fixture.db
			.update(operations)
			.set({ createdAt: Date.now() - 86_400_001 })
			.where(eq(operations.id, operation.id));
		await reconcileProjectImages();
		expect(await persistProjectImage(operation.id, source, new ImageBudget())).toMatchObject({
			ok: false,
		});
		expect((await fixture.db.select().from(projects))[0].ogImageUrl).toBe(previous);
	});
	it('leaves recent pending operations alone', async () => {
		await prepare();
		expect(await reconcileProjectImages()).toEqual({ processed: 0, failed: 0 });
		expect(context.del).not.toHaveBeenCalled();
	});
	it('recovers failed cleanup after its project has been deleted', async () => {
		const id = await fixture.db.transaction(async (tx) => {
			await tx.delete(projects).where(eq(projects.id, 1));
			return recordImageCleanup(tx, 1, previous);
		});
		context.del.mockRejectedValueOnce(new Error('storage unavailable'));
		expect(await cleanupImageOperation(id)).toMatchObject({ ok: false });
		expect((await state(id)).retryCount).toBe(1);
		await reconcileProjectImages();
		expect((await state(id)).state).toBe('complete');
	});
	it('does not delete any blob still referenced by a project', async () => {
		const id = await fixture.db.transaction((tx) => recordImageCleanup(tx, 1, previous));
		await cleanupImageOperation(id);
		expect(context.del).not.toHaveBeenCalled();
	});
	it('honors active leases, recovers expired ones, and tolerates repeated cron runs', async () => {
		const operation = await prepare();
		await fixture.db
			.update(operations)
			.set({ state: 'abandoned', leaseUntil: Date.now() + 60_000 });
		await reconcileProjectImages();
		expect(context.del).not.toHaveBeenCalled();
		await fixture.db.update(operations).set({ leaseUntil: Date.now() - 1 });
		await Promise.all([reconcileProjectImages(), reconcileProjectImages()]);
		expect(context.del).toHaveBeenCalledTimes(1);
		expect((await state(operation.id)).state).toBe('complete');
	});
	it('rejects cleanup from a different configured store', async () => {
		const operation = await prepare();
		await fixture.db.update(operations).set({
			state: 'abandoned',
			storeOrigin: 'https://other.public.blob.vercel-storage.com',
		});
		expect(await cleanupImageOperation(operation.id)).toMatchObject({ ok: false });
		expect(context.del).not.toHaveBeenCalled();
	});
});
