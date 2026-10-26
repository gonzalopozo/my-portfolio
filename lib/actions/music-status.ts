'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { unstable_rethrow } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { MUSIC_CACHE_TAG } from '@/lib/cache-tags';
import { reportMusicIssues } from '@/lib/music-diagnostics';
import { MUSIC_ISSUE_MESSAGES, type MusicRefreshState } from '@/lib/music-status';
import { getMusicSnapshot } from '@/lib/queries/last-fm';

/** Expire and reload the shared music cache; authorization failures must propagate. */
export async function refreshMusicStatus(): Promise<MusicRefreshState> {
	await requireAdmin();
	// This action accepts no input; no client data controls the cache tag or request.
	try {
		updateTag(MUSIC_CACHE_TAG);
		const snapshot = await getMusicSnapshot();
		revalidatePath('/');
		revalidatePath('/dashboard/music-status');
		return {
			error: null,
			message:
				snapshot.status === 'unavailable' || snapshot.status === 'degraded'
					? 'Estado actualizado. Hay incidencias en la integración; consulta los detalles.'
					: 'Estado actualizado.',
		};
	} catch (error) {
		unstable_rethrow(error);
		reportMusicIssues([
			{ integration: 'refresh', operation: 'refresh', code: 'refresh-failed' },
		]);
		return { error: MUSIC_ISSUE_MESSAGES['refresh-failed'], message: null };
	}
}
