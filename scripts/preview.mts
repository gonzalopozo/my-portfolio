import { readFile } from 'node:fs/promises';
import {
	api,
	output,
	required,
	verifiedOrigin,
	verifiedSource,
	type Deployment,
} from './platform.mjs';
import { smoke } from './smoke.mjs';

const event = JSON.parse(await readFile(required('GITHUB_EVENT_PATH'), 'utf8')) as {
	deployment?: { sha: string };
	deployment_status?: { state: string; target_url?: string; environment_url?: string };
};
let id = process.env.DEPLOYMENT_ID;
if (!id) {
	if (event.deployment_status?.state !== 'success')
		throw new Error('Only successful preview deployments are eligible.');
	const url = new URL(
		event.deployment_status.environment_url ?? event.deployment_status.target_url ?? '',
	);
	if (
		url.protocol !== 'https:' ||
		!/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== '/'
	)
		throw new Error('Unexpected preview status URL.');
	id = url.hostname;
}
if (!/^(?:dpl_[A-Za-z0-9]+|[a-z0-9-]+\.vercel\.app)$/.test(id))
	throw new Error('Invalid preview deployment reference.');
const deployment = await api<Deployment>('vercel', `/v13/deployments/${id}`);
const sha = verifiedSource(deployment);
if (
	deployment.readyState !== 'READY' ||
	deployment.target === 'production' ||
	(event.deployment && event.deployment.sha !== sha) ||
	!Number.isFinite(deployment.createdAt) ||
	Date.now() - deployment.createdAt < 0 ||
	Date.now() - deployment.createdAt > 86400000
)
	throw new Error('Preview source, age or target mismatch.');
const origin = verifiedOrigin(deployment);
await smoke(origin, sha, true, false);
await output('origin', origin);
await output('sha', sha);
