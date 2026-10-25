// @vitest-environment node
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
	findMany: vi.fn(),
	upload: vi.fn(),
	cleanup: vi.fn(),
	redirect: vi.fn(),
	updateTag: vi.fn(),
	revalidatePath: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/db', () => ({
	db: {
		transaction: async (callback: (transaction: unknown) => unknown) =>
			callback((await import('@/db')).db),
		select: mocks.select,
		insert: mocks.insert,
		update: mocks.update,
		delete: mocks.delete,
		query: { projectSkills: { findMany: mocks.findMany } },
	},
}));
vi.mock('@/lib/og-image', () => ({
	saveImageInVercelBlob: mocks.upload,
	deleteOldImageInVercelBlob: mocks.cleanup,
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

const oldImage = 'https://store.public.blob.vercel-storage.com/old.png';
const newImage = 'https://store.public.blob.vercel-storage.com/new.png';
const sourceUrl = 'https://example.com/project';
const failure: OgImageError = {
	code: 'timeout',
	stage: 'page-fetch',
	reference: '11111111-1111-4111-8111-111111111111',
};
const cleanupFailure: OgImageError = { ...failure, code: 'delete-failed', stage: 'cleanup' };

function form(url = sourceUrl) {
	const data = new FormData();
	data.set('title', 'Portfolio');
	data.set('description', 'Personal portfolio');
	data.set('url', url);
	data.set('status', 'active');
	return data;
}

function existingProject(url: string | null = sourceUrl) {
	mocks.select.mockReturnValue({
		from: () => ({ where: async () => [{ url, ogImageUrl: oldImage }] }),
	});
}

function redirectedWarning() {
	const [path] = mocks.redirect.mock.calls.at(-1)!;
	return parseOgImageWarning(
		Object.fromEntries(new URL(path, 'https://admin.example.com').searchParams),
	);
}

beforeEach(() => {
	vi.resetAllMocks();
	mocks.admin.mockResolvedValue({ user: { id: 'admin' } });
	existingProject();
	mocks.insert.mockReturnValue({
		values: () => ({ returning: async () => [{ insertedId: 7 }] }),
	});
	mocks.findMany.mockResolvedValue([]);
	mocks.update.mockReturnValue({ set: mocks.set });
	mocks.set.mockReturnValue({ where: () => ({ returning: mocks.returning }) });
	mocks.returning.mockResolvedValue([{ id: 7 }]);
	mocks.delete.mockReturnValue({
		where: () => ({ returning: async () => [{ ogImageUrl: oldImage }] }),
	});
	mocks.upload.mockResolvedValue({ ok: true, url: newImage });
	mocks.cleanup.mockResolvedValue({ ok: true });
	mocks.redirect.mockImplementation(() => {
		throw new Error('redirect');
	});
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('project saves with image warnings', () => {
	it('creates a project despite an image failure and redirects with safe feedback', async () => {
		mocks.select.mockReturnValue({ from: async () => [{ maxOrder: 0 }] });
		mocks.upload.mockResolvedValue({ ok: false, error: failure });
		await expect(createProject(form())).rejects.toThrow('redirect');
		expect(mocks.insert).toHaveBeenCalled();
		expect(redirectedWarning()).toEqual({ projectId: 7, operation: 'create', error: failure });
		expect(mocks.updateTag).toHaveBeenCalled();
		expect(mocks.cleanup).not.toHaveBeenCalled();
	});

	it('redirects a saved project with a persistence warning and cleans the unused upload', async () => {
		mocks.select.mockReturnValue({ from: async () => [{ maxOrder: 0 }] });
		mocks.returning.mockRejectedValueOnce(new Error('database unavailable'));
		await expect(createProject(form())).rejects.toThrow('redirect');
		expect(redirectedWarning()).toMatchObject({
			projectId: 7,
			operation: 'create',
			error: { code: 'persist-failed' },
		});
		expect(mocks.cleanup).toHaveBeenCalledExactlyOnceWith(newImage, 7);
		expect(mocks.updateTag).toHaveBeenCalled();
	});

	it('updates project data and preserves the old image when the source fails', async () => {
		mocks.upload.mockResolvedValue({ ok: false, error: failure });
		await expect(updateProject(7, form('https://example.com/new'))).rejects.toThrow('redirect');
		expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ title: 'Portfolio' }));
		expect(mocks.set).not.toHaveBeenCalledWith({ ogImageUrl: newImage });
		expect(redirectedWarning()).toEqual({ projectId: 7, operation: 'update', error: failure });
		expect(mocks.cleanup).not.toHaveBeenCalled();
	});

	it('removes the database reference before cleaning up a cleared source URL', async () => {
		mocks.cleanup.mockResolvedValue({ ok: false, error: cleanupFailure });
		await expect(updateProject(7, form(''))).rejects.toThrow('redirect');
		expect(mocks.set).toHaveBeenCalledWith({ ogImageUrl: null });
		expect(mocks.set.mock.invocationCallOrder.at(-1)).toBeLessThan(
			mocks.cleanup.mock.invocationCallOrder[0],
		);
		expect(redirectedWarning()?.error).toEqual(cleanupFailure);
	});

	it('keeps the image blob when clearing its database reference fails', async () => {
		mocks.set.mockImplementation((values: { ogImageUrl?: string | null }) => {
			if (values.ogImageUrl === null) throw new Error('database token secret');
			return { where: async () => undefined };
		});
		await expect(updateProject(7, form(''))).rejects.toThrow('redirect');
		expect(redirectedWarning()?.error.code).toBe('persist-failed');
		expect(mocks.cleanup).not.toHaveBeenCalled();
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
	});

	it('does not clean the old image if a concurrent edit prevents clearing the reference', async () => {
		mocks.returning.mockResolvedValueOnce([]);
		await expect(updateProject(7, form(''))).rejects.toThrow('redirect');
		expect(redirectedWarning()?.error.code).toBe('persist-failed');
		expect(mocks.cleanup).not.toHaveBeenCalled();
	});

	it('does not refetch the image for an unchanged source URL', async () => {
		await expect(updateProject(7, form())).rejects.toThrow('redirect');
		expect(mocks.upload).not.toHaveBeenCalled();
		expect(mocks.redirect).toHaveBeenCalledWith('/dashboard/projects');
	});
});

describe('manual OG image refresh', () => {
	it('keeps the old image when acquisition fails', async () => {
		mocks.upload.mockResolvedValue({ ok: false, error: failure });
		expect(await refreshProjectOgImage(7)).toEqual({ ok: false, error: failure });
		expect(mocks.update).not.toHaveBeenCalled();
		expect(mocks.cleanup).not.toHaveBeenCalled();
	});

	it('persists the replacement before deleting the previous image', async () => {
		expect(await refreshProjectOgImage(7)).toEqual({ ok: true });
		expect(mocks.set).toHaveBeenCalledWith({ ogImageUrl: newImage });
		expect(mocks.cleanup).toHaveBeenCalledWith(oldImage, 7);
		expect(mocks.returning.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.cleanup.mock.invocationCallOrder[0],
		);
		expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects');
	});

	it('cleans up an unused upload on persistence failure without deleting the old image', async () => {
		mocks.returning.mockRejectedValueOnce(new Error('database URL secret'));
		expect(await refreshProjectOgImage(7)).toMatchObject({
			ok: false,
			error: { code: 'persist-failed' },
		});
		expect(mocks.cleanup).toHaveBeenCalledExactlyOnceWith(newImage, 7);
		expect(mocks.updateTag).not.toHaveBeenCalled();
	});

	it('cleans up an upload when its project was deleted before persistence', async () => {
		mocks.returning.mockResolvedValueOnce([]);
		expect(await refreshProjectOgImage(7)).toMatchObject({
			ok: false,
			error: { code: 'persist-failed' },
		});
		expect(mocks.cleanup).toHaveBeenCalledWith(newImage, 7);
	});

	it('keeps the primary persistence failure if secondary upload cleanup fails', async () => {
		mocks.returning.mockRejectedValueOnce(new Error('database unavailable'));
		mocks.cleanup.mockResolvedValue({ ok: false, error: cleanupFailure });
		expect(await refreshProjectOgImage(7)).toMatchObject({
			ok: false,
			error: { code: 'persist-failed' },
		});
	});

	it('reports old-image cleanup failure as a warning after a successful refresh', async () => {
		mocks.cleanup.mockResolvedValue({ ok: false, error: cleanupFailure });
		expect(await refreshProjectOgImage(7)).toEqual({ ok: true, warning: cleanupFailure });
		expect(mocks.updateTag).toHaveBeenCalled();
		expect(mocks.revalidatePath).toHaveBeenCalled();
	});

	it('returns a safe no-source outcome', async () => {
		existingProject(null);
		expect(await refreshProjectOgImage(7)).toMatchObject({
			ok: false,
			error: { code: 'no-source' },
		});
		expect(mocks.upload).not.toHaveBeenCalled();
	});

	it('returns a safe not-found outcome', async () => {
		mocks.select.mockReturnValue({ from: () => ({ where: async () => [] }) });
		expect(await refreshProjectOgImage(7)).toMatchObject({
			ok: false,
			error: { code: 'not-found' },
		});
		expect(mocks.upload).not.toHaveBeenCalled();
	});

	it('handles a failed project lookup without returning database details', async () => {
		mocks.select.mockImplementation(() => {
			throw new Error('database credentials secret');
		});
		const result = await refreshProjectOgImage(7);
		expect(result).toMatchObject({
			ok: false,
			error: { code: 'unexpected', stage: 'persistence' },
		});
		expect(JSON.stringify(result)).not.toContain('secret');
	});

	it('rejects invalid identifiers before lookup', async () => {
		expect(await refreshProjectOgImage(-1)).toMatchObject({
			ok: false,
			error: { code: 'invalid-project' },
		});
		expect(mocks.select).not.toHaveBeenCalled();
	});

	it('propagates denied authorization before any side effects', async () => {
		mocks.admin.mockRejectedValue(new Error('Access denied'));
		await expect(refreshProjectOgImage(7)).rejects.toThrow('Access denied');
		expect(mocks.select).not.toHaveBeenCalled();
		expect(mocks.upload).not.toHaveBeenCalled();
	});
});

describe('project deletion image cleanup', () => {
	it('reports cleanup failure after deleting the project and invalidating caches', async () => {
		mocks.cleanup.mockResolvedValue({ ok: false, error: cleanupFailure });
		expect(await deleteProject(7)).toEqual({ ok: true, warning: cleanupFailure });
		expect(mocks.delete.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.cleanup.mock.invocationCallOrder[0],
		);
		expect(mocks.cleanup).toHaveBeenCalledWith(oldImage, 7);
		expect(mocks.updateTag).toHaveBeenCalled();
	});

	it('never removes an image if the database deletion fails', async () => {
		mocks.delete.mockImplementation(() => {
			throw new Error('database unavailable');
		});
		expect(await deleteProject(7)).toMatchObject({
			ok: false,
			error: { code: 'project-delete-failed' },
		});
		expect(mocks.cleanup).not.toHaveBeenCalled();
	});
});
