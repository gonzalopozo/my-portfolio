import {
	api,
	commit,
	required,
	verifiedOrigin,
	verifiedSource,
	type Deployment,
} from './platform.mjs';
import { assertMainController } from './ci-context.mjs';

type PreviewEvent = {
	repository?: { id: number; full_name: string };
	deployment?: { sha: string; environment: string };
	deployment_status?: { state: string; target_url?: string; environment_url?: string };
};

/** Webhook URLs authorize delivery; independently prove every remote target before using tokens. */
export function previewReference(body: string) {
	if (Buffer.byteLength(body) > 262144) throw new Error('Preview event is too large.');
	const event = JSON.parse(body) as PreviewEvent;
	if (event.deployment_status?.state !== 'success' || event.deployment?.environment !== 'Preview')
		return;
	if (
		String(event.repository?.id) !== required('GITHUB_REPOSITORY_ID') ||
		event.repository?.full_name !== required('GITHUB_REPOSITORY')
	)
		throw new Error('Preview event belongs to another repository.');
	const url = new URL(
		event.deployment_status.environment_url ?? event.deployment_status.target_url ?? '',
	);
	if (
		url.protocol !== 'https:' ||
		!/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) ||
		url.username ||
		url.password ||
		url.port ||
		url.search ||
		url.hash ||
		url.pathname !== '/'
	)
		throw new Error('Unexpected preview status URL.');
	return { id: url.hostname, sha: commit(event.deployment.sha) };
}

export async function verifyPreview(id: string, eventSha?: string) {
	if (!/^(?:dpl_[A-Za-z0-9]+|[a-z0-9-]+\.vercel\.app)$/.test(id))
		throw new Error('Invalid preview deployment reference.');
	const deployment = await api<Deployment>('vercel', `/v13/deployments/${id}`);
	verifiedOrigin(deployment);
	const sha = verifiedSource(deployment);
	if (
		deployment.readyState !== 'READY' ||
		deployment.target === 'production' ||
		(eventSha && eventSha !== sha) ||
		!Number.isFinite(deployment.createdAt) ||
		Date.now() - deployment.createdAt < 0 ||
		Date.now() - deployment.createdAt > 86400000
	)
		throw new Error('Preview source, age or target mismatch.');
	const branches = await api<{ name: string }[]>(
		'github',
		`/repos/${required('GITHUB_REPOSITORY')}/commits/${sha}/branches-where-head?per_page=1`,
	);
	if (!branches.length)
		throw new Error('Fork-only or superseded Preview source is not eligible.');
	return { deployment, sha };
}

export async function verifyPreviewController() {
	const sha = assertMainController();
	const branch = await api<{ object: { sha: string } }>(
		'github',
		`/repos/${required('GITHUB_REPOSITORY')}/git/ref/heads/main`,
	);
	if (branch.object.sha !== sha) throw new Error('Preview controller main checkout is stale.');
}
