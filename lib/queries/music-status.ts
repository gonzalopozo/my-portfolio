import 'server-only';
import { requireAdminPage } from '@/lib/admin';
import { getMusicSnapshot } from '@/lib/queries/last-fm';
import type { MusicDiagnostics } from '@/lib/music-status';

/** Authorize each read before accessing diagnostics stored in the public track cache. */
export async function getAdminMusicStatus(): Promise<MusicDiagnostics> {
	await requireAdminPage();
	const { status, checkedAt, correlationId, integrations } = await getMusicSnapshot();
	return { status, checkedAt, correlationId, integrations };
}
