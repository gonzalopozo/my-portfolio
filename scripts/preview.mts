import { output, required, verifiedOrigin } from './platform.mjs';
import { previewReference, verifyPreview, verifyPreviewController } from './preview-controller.mjs';
import { smoke } from './smoke.mjs';

const reference = process.env.PREVIEW_EVENT_JSON
	? previewReference(required('PREVIEW_EVENT_JSON'))
	: { id: required('DEPLOYMENT_ID'), sha: undefined };
if (reference) {
	await verifyPreviewController();
	const { deployment, sha } = await verifyPreview(reference.id, reference.sha);
	const origin = verifiedOrigin(deployment);
	await smoke(origin, sha, true, false);
	await output('preview', 'origin', origin);
	await output('preview', 'sha', sha);
	console.info('Preview HTTP smoke verified.');
} else console.info('Ignored non-Preview or unsuccessful deployment event.');
