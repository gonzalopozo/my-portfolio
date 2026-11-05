import {
	api,
	commit,
	deploymentId,
	required,
	verifiedOrigin,
	verifiedSource,
	type Deployment,
} from './platform.mjs';

async function body(response: Response) {
	if (!response.body) throw new Error('Smoke response is empty.');
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > 2 * 1024 * 1024) throw new Error('Smoke response exceeds its size limit.');
			chunks.push(value);
		}
		return Buffer.concat(chunks).toString('utf8');
	} finally {
		await reader.cancel().catch(() => {});
	}
}

async function json<T>(response: Response): Promise<T> {
	const content = await body(response);
	try {
		return JSON.parse(content) as T;
	} catch {
		throw new Error('Smoke response contains invalid metadata; body omitted.');
	}
}

async function hasExpectedHealth(response: Response, sha: string) {
	const health = await json<{ status?: string; release?: string }>(response);
	return (
		health.status === 'ok' &&
		health.release === sha &&
		response.headers.get('cache-control')?.includes('no-store') === true
	);
}

/**
 * Wait for public routing to serve this release after promotion or rollback.
 * The project's production target can update before the canonical domain does.
 */
export async function waitForCanonicalHealth(origin: string, sha: string) {
	let target: URL;
	try {
		target = new URL(origin);
	} catch {
		throw new Error('Invalid production origin.');
	}
	if (
		target.protocol !== 'https:' ||
		target.username ||
		target.password ||
		target.port ||
		target.pathname !== '/' ||
		target.search ||
		target.hash
	)
		throw new Error('Invalid production origin.');
	const deadline = Date.now() + 120000;
	while (Date.now() < deadline) {
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;
		const response = await fetch(new URL('/api/health', target), {
			cache: 'no-store',
			redirect: 'manual',
			signal: AbortSignal.timeout(Math.min(6000, remaining)),
		}).catch(() => undefined);
		if (response) {
			if (response.status === 200) {
				if (await hasExpectedHealth(response, sha).catch(() => false)) return;
			} else {
				await response.body?.cancel().catch(() => {});
			}
		}
		const delay = Math.min(4000, deadline - Date.now());
		if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
	}
	throw new Error('Canonical production health did not converge to the expected release.');
}

/** Tokens are attached only to a verified exact deployment origin; redirects never carry them. */
export async function smoke(
	origin: string,
	sha: string,
	protectedDeployment: boolean,
	readiness = protectedDeployment,
) {
	const headers: Record<string, string> = {};
	if (protectedDeployment) {
		const target = new URL(origin);
		if (
			target.protocol !== 'https:' ||
			!/^[a-z0-9-]+\.vercel\.app$/.test(target.hostname) ||
			target.username ||
			target.password ||
			target.port ||
			target.pathname !== '/' ||
			target.search ||
			target.hash
		)
			throw new Error('Unverified smoke destination.');
		const deployment = await api<Deployment>('vercel', `/v13/deployments/${target.hostname}`);
		if (
			verifiedOrigin(deployment) !== origin ||
			deployment.readyState !== 'READY' ||
			verifiedSource(deployment) !== sha
		)
			throw new Error('Smoke target source or project mismatch.');
		headers['x-vercel-protection-bypass'] = required('VERCEL_AUTOMATION_BYPASS_SECRET');
	}
	for (const path of ['/api/health', '/', '/login', '/api/auth/ok']) {
		const response = await fetch(new URL(path, origin), {
			headers,
			redirect: 'manual',
			signal: AbortSignal.timeout(15000),
		});
		if (response.status !== 200)
			throw new Error(`Smoke request failed for ${path} (${response.status}).`);
		if (path === '/api/health') {
			if (!(await hasExpectedHealth(response, sha)))
				throw new Error('Deployment identity or uncached health check mismatch.');
		} else if (path === '/') {
			const content = await body(response);
			if (!content.includes('Gonzalo Pozo') || !content.includes('main-content'))
				throw new Error('Critical public content is missing.');
		} else if (path === '/api/auth/ok') {
			if ((await json<{ ok?: boolean }>(response)).ok !== true)
				throw new Error('Authentication endpoint is unavailable.');
		} else {
			await body(response);
		}
	}
	if (readiness) {
		const response = await fetch(`${origin}/api/ready`, {
			headers: { ...headers, authorization: `Bearer ${required('HEALTH_READINESS_TOKEN')}` },
			redirect: 'error',
			signal: AbortSignal.timeout(6000),
		});
		if (
			response.status !== 200 ||
			(await json<{ status?: string }>(response)).status !== 'ready'
		)
			throw new Error('Candidate database readiness failed.');
	}
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
	const deployment = await api<Deployment>(
		'vercel',
		`/v13/deployments/${deploymentId(required('DEPLOYMENT_ID'))}`,
	);
	const sha = commit(required('EXPECTED_SHA'));
	if (deployment.readyState !== 'READY' || verifiedSource(deployment) !== sha)
		throw new Error('Deployment source or state mismatch.');
	await smoke(verifiedOrigin(deployment), sha, true);
}
