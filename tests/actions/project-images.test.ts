import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OgImageError } from '@/lib/og-image-feedback';

const mocks = vi.hoisted(() => ({
	admin: vi.fn(),
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	set: vi.fn(),
	returning: vi.fn(),
	upload: vi.fn(),
	persist: vi.fn(),
	cleanup: vi.fn(),
	record: vi.fn(),
	redirect: vi.fn(),
	updateTag: vi.fn(),
	revalidatePath: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/db', () => ({
	db: {
		transaction: async (callback: (tx: unknown) => unknown) =>
			callback((await import('@/db')).db),
		select: mocks.select,
		insert: mocks.insert,
		update: mocks.update,
		delete: mocks.delete,
		query: { projectSkills: { findMany: async () => [] } },
	},
}));
vi.mock('@/lib/og-image', () => ({ saveImageInVercelBlob: mocks.upload }));
vi.mock('@/lib/og-image/store', () => ({
	persistProjectImage: mocks.persist,
	cleanupImageOperation: mocks.cleanup,
	recordImageCleanup: mocks.record,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag, revalidatePath: mocks.revalidatePath }));

import {
	createProject,
	deleteProject,
	refreshProjectOgImage,
	updateProject,
} from '@/lib/actions/projects';
import { parseOgImageWarning } from '@/lib/og-image-feedback';

const oldImage = 'https://store.public.blob.vercel-storage.com/og-images/7-123.png';
const source = 'https://example.com/project';
const error: OgImageError = {
	code: 'timeout',
	stage: 'page-fetch',
	reference: '11111111-1111-4111-8111-111111111111',
};
const cleanupError: OgImageError = { ...error, code: 'delete-failed', stage: 'cleanup' };
function form(url = source) {
	const data = new FormData();
	data.set('title', 'Portfolio');
	data.set('description', 'Personal portfolio');
	data.set('url', url);
	data.set('status', 'active');
	return data;
}
function redirectedWarning() {
	return parseOgImageWarning(
		Object.fromEntries(
			new URL(mocks.redirect.mock.calls.at(-1)![0], 'https://admin.example.com').searchParams,
		),
	);
}
beforeEach(() => {
	vi.resetAllMocks();
	mocks.select.mockReturnValue({
		from: () => ({ where: async () => [{ url: source, ogImageUrl: oldImage }] }),
	});
	mocks.insert.mockReturnValue({
		values: () => ({ returning: async () => [{ insertedId: 7 }] }),
	});
	mocks.update.mockReturnValue({ set: mocks.set });
	mocks.set.mockReturnValue({ where: () => ({ returning: mocks.returning }) });
	mocks.returning.mockResolvedValue([{ id: 7 }]);
	mocks.delete.mockReturnValue({
		where: () => ({ returning: async () => [{ ogImageUrl: oldImage }] }),
	});
	mocks.upload.mockResolvedValue({
		ok: true,
		url: 'https://store.public.blob.vercel-storage.com/og-images/7-124.png',
		operationId: error.reference,
	});
	mocks.persist.mockResolvedValue({ ok: true });
	mocks.cleanup.mockResolvedValue({ ok: true });
	mocks.record.mockResolvedValue('cleanup-operation');
	mocks.redirect.mockImplementation(() => {
		throw new Error('redirect');
	});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('project image action feedback', () => {
	it('creates the project despite image acquisition failure', async () => {
		mocks.select.mockReturnValue({ from: async () => [{ maxOrder: 0 }] });
		mocks.upload.mockResolvedValue({ ok: false, error });
		await expect(createProject(form())).rejects.toThrow('redirect');
		expect(redirectedWarning()).toEqual({ projectId: 7, operation: 'create', error });
		expect(mocks.persist).not.toHaveBeenCalled();
		expect(mocks.updateTag).toHaveBeenCalled();
	});
	it('passes the previous image and shared deadline to the durable replacement', async () => {
		expect(await refreshProjectOgImage(7)).toEqual({ ok: true });
		expect(mocks.upload).toHaveBeenCalledWith(source, 7, oldImage, expect.anything());
		expect(mocks.persist).toHaveBeenCalledWith(
			error.reference,
			source,
			mocks.upload.mock.calls[0][3],
		);
	});
	it('retains failed acquisition feedback without persistence or cleanup', async () => {
		mocks.upload.mockResolvedValue({ ok: false, error });
		expect(await refreshProjectOgImage(7)).toEqual({ ok: false, error });
		expect(mocks.persist).not.toHaveBeenCalled();
		expect(mocks.cleanup).not.toHaveBeenCalled();
	});
	it('returns uncertainty and refreshes cached data without deleting anything', async () => {
		const uncertain = { ...error, code: 'persistence-uncertain' };
		mocks.persist.mockResolvedValue({ ok: false, error: uncertain });
		expect(await refreshProjectOgImage(7)).toEqual({ ok: false, error: uncertain });
		expect(mocks.cleanup).not.toHaveBeenCalled();
		expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects');
	});
	it('updates project data even when image acquisition fails', async () => {
		mocks.upload.mockResolvedValue({ ok: false, error });
		await expect(updateProject(7, form('https://example.com/new'))).rejects.toThrow('redirect');
		expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ title: 'Portfolio' }));
		expect(redirectedWarning()?.error).toEqual(error);
	});
	it('does not refetch for an unchanged source', async () => {
		await expect(updateProject(7, form())).rejects.toThrow('redirect');
		expect(mocks.upload).not.toHaveBeenCalled();
	});
	it('records cleanup alongside reference removal before touching storage', async () => {
		mocks.cleanup.mockResolvedValue({ ok: false, error: cleanupError });
		await expect(updateProject(7, form(''))).rejects.toThrow('redirect');
		expect(mocks.record).toHaveBeenCalledWith(expect.anything(), 7, oldImage);
		expect(mocks.record.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.cleanup.mock.invocationCallOrder[0],
		);
		expect(redirectedWarning()?.error).toEqual(cleanupError);
	});
	it('does not clean an image when the clear-reference CAS fails', async () => {
		mocks.returning.mockResolvedValueOnce([]);
		await expect(updateProject(7, form(''))).rejects.toThrow('redirect');
		expect(mocks.record).not.toHaveBeenCalled();
		expect(mocks.cleanup).not.toHaveBeenCalled();
		expect(redirectedWarning()?.error.code).toBe('persist-failed');
	});
	it('deletes the project and returns secondary cleanup failures as warnings', async () => {
		mocks.cleanup.mockResolvedValue({ ok: false, error: cleanupError });
		expect(await deleteProject(7)).toEqual({ ok: true, warning: cleanupError });
		expect(mocks.record).toHaveBeenCalledWith(expect.anything(), 7, oldImage);
		expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects');
	});
	it('does not delete storage after an uncertain project deletion', async () => {
		mocks.delete.mockImplementation(() => {
			throw new Error('secret database credentials');
		});
		expect(await deleteProject(7)).toMatchObject({
			ok: false,
			error: { code: 'persistence-uncertain' },
		});
		expect(mocks.cleanup).not.toHaveBeenCalled();
		expect(mocks.updateTag).toHaveBeenCalled();
		expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects');
	});
	it('rejects invalid IDs and authorization before side effects', async () => {
		expect(await refreshProjectOgImage(-1)).toMatchObject({
			ok: false,
			error: { code: 'invalid-project' },
		});
		mocks.admin.mockRejectedValueOnce(new Error('Access denied'));
		await expect(refreshProjectOgImage(7)).rejects.toThrow('Access denied');
		expect(mocks.select).not.toHaveBeenCalled();
	});
	it.each([null, undefined])('handles missing sources and deleted projects', async (value) => {
		mocks.select.mockReturnValue({
			from: () => ({
				where: async () => (value === null ? [{ url: null, ogImageUrl: oldImage }] : []),
			}),
		});
		expect(await refreshProjectOgImage(7)).toMatchObject({
			ok: false,
			error: { code: value === null ? 'no-source' : 'not-found' },
		});
		expect(mocks.upload).not.toHaveBeenCalled();
	});
});
