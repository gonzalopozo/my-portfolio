import { appendFile } from 'node:fs/promises';

export function required(name: string) {
	const value = process.env[name];
	if (!value) throw new Error(`Missing configuration: ${name}`);
	return value;
}
export function commit(value: string) {
	if (!/^[a-f0-9]{40}$/.test(value)) throw new Error('A full immutable commit SHA is required.');
	return value;
}
export function deploymentId(value: string) {
	if (!/^dpl_[A-Za-z0-9]+$/.test(value)) throw new Error('Invalid deployment identifier.');
	return value;
}

export async function api<T>(
	platform: 'github' | 'vercel',
	path: string,
	method = 'GET',
	body?: unknown,
): Promise<T> {
	const base = platform === 'github' ? 'https://api.github.com' : 'https://api.vercel.com';
	const url = new URL(path, base);
	if (url.origin !== base) throw new Error('Unexpected platform origin.');
	if (platform === 'vercel' && process.env.VERCEL_TEAM_ID)
		url.searchParams.set('teamId', process.env.VERCEL_TEAM_ID);
	const response = await fetch(url, {
		method,
		redirect: 'error',
		signal: AbortSignal.timeout(30000),
		headers: {
			authorization: `Bearer ${required(platform === 'github' ? 'GITHUB_TOKEN' : 'VERCEL_TOKEN')}`,
			'content-type': 'application/json',
			accept: 'application/json',
			'x-github-api-version': '2022-11-28',
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok)
		throw new Error(
			`${platform} operation failed (${response.status}); response omitted to protect secrets.`,
		);
	if (response.status === 204) return undefined as T;
	const text = await response.text();
	try {
		return (text ? JSON.parse(text) : undefined) as T;
	} catch {
		throw new Error(`${platform} returned invalid metadata; response omitted.`);
	}
}

export type Project = {
	id: string;
	name: string;
	autoAssignCustomDomains?: boolean;
	link?: { type: string; repoId: number | string; productionBranch?: string };
	targets?: { production?: { id: string } };
};
export type Deployment = {
	id: string;
	projectId: string;
	url: string;
	readyState: string;
	target?: string;
	createdAt: number;
	meta?: { githubCommitSha?: string; githubRepoId?: string };
	gitSource?: { sha?: string; repoId?: number | string };
};

export async function project() {
	const value = await api<Project>(
		'vercel',
		`/v9/projects/${encodeURIComponent(required('VERCEL_PROJECT_ID'))}`,
	);
	if (
		value.id !== required('VERCEL_PROJECT_ID') ||
		value.link?.type !== 'github' ||
		value.link.productionBranch !== 'main'
	)
		throw new Error('Project must be linked to GitHub with main as production branch.');
	if (String(value.link.repoId) !== required('GITHUB_REPOSITORY_ID'))
		throw new Error('Vercel project is linked to another GitHub repository.');
	return value;
}

export function verifiedSource(deployment: Deployment) {
	const repository = deployment.meta?.githubRepoId ?? deployment.gitSource?.repoId;
	if (String(repository) !== required('GITHUB_REPOSITORY_ID'))
		throw new Error('Deployment repository identity is unproven.');
	return commit(deployment.meta?.githubCommitSha ?? deployment.gitSource?.sha ?? '');
}

export function verifiedOrigin(deployment: Deployment) {
	const url = new URL(`https://${deployment.url}`);
	if (
		deployment.projectId !== required('VERCEL_PROJECT_ID') ||
		!/^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) ||
		url.pathname !== '/' ||
		url.port ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	)
		throw new Error('Unverified deployment origin.');
	return url.origin;
}

export async function output(name: string, value: string) {
	if (!/^[a-z_]+$/.test(name) || /[\r\n]/.test(value)) throw new Error('Unsafe workflow output.');
	if (process.env.GITHUB_OUTPUT)
		await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
