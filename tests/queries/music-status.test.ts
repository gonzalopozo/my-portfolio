import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdminPage: vi.fn() }));
vi.mock('@/lib/queries/last-fm', () => ({ getMusicSnapshot: vi.fn() }));

import { getAdminMusicStatus } from '@/lib/queries/music-status';
import { requireAdminPage } from '@/lib/admin';
import { getMusicSnapshot } from '@/lib/queries/last-fm';

afterEach(() => vi.resetAllMocks());

describe('admin music diagnostics', () => {
	it('rejects unauthorized reads before accessing the shared snapshot', async () => {
		const rejection = new Error('REDIRECT:/dashboard');
		vi.mocked(requireAdminPage).mockRejectedValue(rejection);
		await expect(getAdminMusicStatus()).rejects.toBe(rejection);
		expect(getMusicSnapshot).not.toHaveBeenCalled();
	});

	it('authorizes reads and returns diagnostics without track data', async () => {
		vi.mocked(getMusicSnapshot).mockResolvedValue({
			status: 'empty',
			track: null,
			checkedAt: '2026-10-14T10:00:00.000Z',
			correlationId: 'attempt-id',
			integrations: [],
		});
		await expect(getAdminMusicStatus()).resolves.toEqual({
			status: 'empty',
			checkedAt: '2026-10-14T10:00:00.000Z',
			correlationId: 'attempt-id',
			integrations: [],
		});
		expect(vi.mocked(requireAdminPage).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(getMusicSnapshot).mock.invocationCallOrder[0],
		);
	});
});
