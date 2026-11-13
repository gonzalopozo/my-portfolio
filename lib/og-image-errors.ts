import 'server-only';
import { reportCaughtFailure } from '@/lib/observability/caught';
import { logOperation } from '@/lib/observability/logger';
import { randomUUID } from 'node:crypto';
import type { OgImageError, OgImageErrorCode, OgImageStage } from '@/lib/og-image-feedback';

/** Log only allowlisted metadata: upstream exceptions can contain credentials and URLs. */
export function reportOgImageError(
	code: OgImageErrorCode,
	stage: OgImageStage,
	projectId?: number,
	httpStatus?: number,
	reference: string = randomUUID(),
): OgImageError {
	const error = { code, stage, reference };
	// Row IDs and upstream URLs are unnecessary for telemetry; reference correlates UI feedback.
	void projectId;
	if (
		[
			'upload-failed',
			'delete-failed',
			'persist-failed',
			'persistence-uncertain',
			'project-delete-failed',
			'unexpected',
		].includes(code)
	) {
		reportCaughtFailure(`project_image.${stage}`, code, error.reference);
	} else {
		logOperation('warn', {
			operation: `project_image.${stage}`,
			classification: code,
			reference: error.reference,
			status: httpStatus,
		});
	}
	return error;
}
