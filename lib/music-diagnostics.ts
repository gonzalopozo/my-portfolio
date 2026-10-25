import 'server-only';
import { reportCaughtFailure } from '@/lib/observability/caught';
import { logOperation } from '@/lib/observability/logger';
import { randomUUID } from 'node:crypto';
import { type MusicIssue } from '@/lib/music-status';

/** Emit only allowlisted metadata; raw errors can contain the Last.fm API key. */
export function reportMusicIssues(issues: MusicIssue[], correlationId = randomUUID()): void {
	for (const issue of issues) {
		if (issue.integration === 'lastfm' || issue.integration === 'refresh') {
			reportCaughtFailure(
				`music.${issue.integration}.${issue.operation}`,
				issue.code,
				correlationId,
			);
		} else {
			logOperation('warn', {
				operation: `music.${issue.integration}.${issue.operation}`,
				classification: issue.code,
				reference: correlationId,
			});
		}
	}
}
