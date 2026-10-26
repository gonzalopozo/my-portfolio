import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdmin: vi.fn() }));
vi.mock('@/lib/queries/last-fm', () => ({ getMusicSnapshot: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));

import { refreshMusicStatus } from '@/lib/actions/music-status';
import { requireAdmin } from '@/lib/admin';
import { getMusicSnapshot } from '@/lib/queries/last-fm';
import { updateTag, revalidatePath } from 'next/cache';
import type { MusicSnapshot } from '@/lib/music-status';

const snapshot: MusicSnapshot = {
	status: 'empty',
	track: null,
	checkedAt: '2026-10-14T10:00:00.000Z',
	correlationId: 'attempt-id',
	integrations: [],
};

beforeEach(() => {
	vi.mocked(getMusicSnapshot).mockResolvedValue(snapshot);
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.resetAllMocks();
	vi.restoreAllMocks();
});

describe('refresh music status', () => {
	it('propagates authorization rejection before cache invalidation or external requests', async () => {
		const rejection = new Error('Access denied.');
		vi.mocked(requireAdmin).mockRejectedValue(rejection);
		await expect(refreshMusicStatus()).rejects.toBe(rejection);
		expect(updateTag).not.toHaveBeenCalled();
		expect(getMusicSnapshot).not.toHaveBeenCalled();
		expect(revalidatePath).not.toHaveBeenCalled();
		expect(console.error).not.toHaveBeenCalled();
	});

	it('expires the shared tag before reloading and refreshing the music status page', async () => {
		await expect(refreshMusicStatus()).resolves.toMatchObject({
			error: null,
			message: 'Estado actualizado.',
		});
		expect(updateTag).toHaveBeenCalledWith('track');
		expect(getMusicSnapshot).toHaveBeenCalledOnce();
		expect(revalidatePath).toHaveBeenCalledWith('/dashboard/music-status');
		expect(revalidatePath).toHaveBeenCalledWith('/');
		expect(revalidatePath).not.toHaveBeenCalledWith('/dashboard');
		expect(vi.mocked(requireAdmin).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(updateTag).mock.invocationCallOrder[0],
		);
		expect(vi.mocked(updateTag).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(getMusicSnapshot).mock.invocationCallOrder[0],
		);
	});

	it('reports remaining integration incidents after a completed retry', async () => {
		vi.mocked(getMusicSnapshot).mockResolvedValue({ ...snapshot, status: 'unavailable' });
		const result = await refreshMusicStatus();
		expect(result.error).toBeNull();
		expect(result.message).toContain('Hay incidencias');
		expect(revalidatePath).toHaveBeenCalledWith('/dashboard/music-status');
	});

	it('returns safe inline feedback if cache refresh fails', async () => {
		vi.mocked(updateTag).mockImplementation(() => {
			throw new Error('secret cache detail');
		});
		const result = await refreshMusicStatus();
		expect(result.error).toBe('No se pudo actualizar el estado. Vuelve a intentarlo.');
		expect(result.message).toBeNull();
		expect(getMusicSnapshot).not.toHaveBeenCalled();
		expect(console.error).toHaveBeenCalledOnce();
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
			'secret cache detail',
		);
	});
});
