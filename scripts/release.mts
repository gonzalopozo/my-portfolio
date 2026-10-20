import { writeFile, mkdir } from 'node:fs/promises';
import {
	api,
	commit,
	deploymentId,
	required,
	project,
	output,
	verifiedOrigin,
	verifiedSource,
	type Deployment,
} from './platform.mjs';
import { smoke } from './smoke.mjs';
import { requireApprovalEnvironment } from './approval.mjs';

type Run = {
	id: number;
	conclusion: string;
	head_sha: string;
	head_branch: string;
	event: string;
	updated_at: string;
};
type ReleaseRecord = {
	id: number;
	sha: string;
	payload?: { vercelDeploymentId?: string; previousDeploymentId?: string } | null;
};
const repository = required('GITHUB_REPOSITORY');
if (
	!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
	process.env.GITHUB_ACTIONS !== 'true' ||
	process.env.GITHUB_REF !== 'refs/heads/main'
)
	throw new Error('Releases run only from the trusted main workflow.');
const sha = commit(required('EXPECTED_SHA'));

async function validateCommit() {
	const branch = await api<{ object: { sha: string } }>(
		'github',
		`/repos/${repository}/git/ref/heads/main`,
	);
	if (branch.object.sha !== sha) throw new Error('Release is stale: main has changed.');
	for (const workflow of ['ci.yml', 'security.yml', 'codeql.yml']) {
		const result = await api<{ workflow_runs: Run[] }>(
			'github',
			`/repos/${repository}/actions/workflows/${workflow}/runs?head_sha=${sha}&branch=main&event=push&per_page=1`,
		);
		const run = result.workflow_runs[0];
		const fresh = (value: Run | undefined) =>
			value &&
			Number.isFinite(Date.parse(value.updated_at)) &&
			Date.now() - Date.parse(value.updated_at) >= -300000 &&
			Date.now() - Date.parse(value.updated_at) < 86400000;
		if (
			!run ||
			run.conclusion !== 'success' ||
			run.head_sha !== sha ||
			run.head_branch !== 'main' ||
			run.event !== 'push' ||
			!fresh(run)
		)
			throw new Error(`Missing fresh merged-commit validation: ${workflow}`);
		const latest = await api<{ workflow_runs: Run[] }>(
			'github',
			`/repos/${repository}/actions/workflows/${workflow}/runs?head_sha=${sha}&branch=main&per_page=1`,
		);
		const current = latest.workflow_runs[0];
		if (
			!current ||
			current.head_sha !== sha ||
			current.head_branch !== 'main' ||
			current.conclusion !== 'success' ||
			!fresh(current)
		)
			throw new Error(
				`The latest validation or scheduled scan is not successful: ${workflow}`,
			);
	}
	for (let page = 1; page <= 100; page++) {
		const alerts = await api<
			{ rule: { severity: string; security_severity_level?: string } }[]
		>(
			'github',
			`/repos/${repository}/code-scanning/alerts?state=open&ref=refs/heads/main&per_page=100&page=${page}`,
		);
		if (
			alerts.some(
				(alert) =>
					['high', 'critical'].includes(alert.rule.security_severity_level ?? '') ||
					alert.rule.severity === 'error',
			)
		)
			throw new Error('Open blocking code scanning findings.');
		if (alerts.length < 100) return;
	}
	throw new Error('Code scanning result pagination exceeded its bound.');
}

async function candidate(id: string) {
	const value = await api<Deployment>('vercel', `/v13/deployments/${deploymentId(id)}`);
	if (
		value.readyState !== 'READY' ||
		value.target !== 'production' ||
		verifiedSource(value) !== sha ||
		!Number.isFinite(value.createdAt) ||
		Date.now() - value.createdAt < 0 ||
		Date.now() - value.createdAt > 86400000
	)
		throw new Error('Candidate is unready, stale, or from the wrong source.');
	verifiedOrigin(value);
	return value;
}

async function evidence(data: object) {
	await mkdir('.ci', { recursive: true });
	await writeFile(
		'.ci/release-evidence.json',
		JSON.stringify(
			{ ...data, sha, runId: process.env.GITHUB_RUN_ID, at: new Date().toISOString() },
			null,
			2,
		),
	);
}

async function waitForLive(id: string) {
	for (let attempt = 0; attempt < 30; attempt++) {
		if ((await project()).targets?.production?.id === id) return;
		await new Promise((resolve) => setTimeout(resolve, 4000));
	}
	throw new Error('Production alias did not converge to the requested deployment.');
}

const operation = process.argv[2];
const configuration = await project();
if (operation === 'preflight') {
	await requireApprovalEnvironment('production');
	await requireApprovalEnvironment('production-migrations');
	await validateCommit();
	if (configuration.autoAssignCustomDomains !== false)
		throw new Error('Disable automatic domain assignment before staging a release.');
	const previous = configuration.targets?.production?.id;
	if (!previous)
		throw new Error(
			'Record an existing production deployment before enabling automated releases.',
		);
	await output('previous', deploymentId(previous));
} else if (operation === 'create') {
	await validateCommit();
	if (configuration.autoAssignCustomDomains !== false)
		throw new Error('Automatic domain assignment would bypass human approval.');
	const created = await api<Deployment>('vercel', '/v13/deployments?forceNew=1', 'POST', {
		name: configuration.name,
		project: configuration.id,
		target: 'production',
		gitSource: { type: 'github', repoId: configuration.link!.repoId, ref: 'main', sha },
	});
	const id = deploymentId(created.id);
	let deployment: Deployment | undefined;
	for (let index = 0; index < 240; index++) {
		const state = await api<Deployment>('vercel', `/v13/deployments/${id}`);
		if (['ERROR', 'CANCELED'].includes(state.readyState))
			throw new Error('Candidate build failed.');
		if (state.readyState === 'READY') {
			deployment = await candidate(id);
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 5000));
	}
	if (!deployment) throw new Error('Candidate build timed out.');
	const current = await project();
	if (current.targets?.production?.id !== required('PREVIOUS_DEPLOYMENT_ID'))
		throw new Error('Production changed during candidate creation.');
	await smoke(verifiedOrigin(deployment), sha, true);
	await output('deployment', id);
	await output('origin', verifiedOrigin(deployment));
	await evidence({
		candidate: id,
		previous: required('PREVIOUS_DEPLOYMENT_ID'),
		state: 'candidate-verified',
	});
} else if (operation === 'promote') {
	await requireApprovalEnvironment('production', true);
	await validateCommit();
	const deployment = await candidate(required('DEPLOYMENT_ID'));
	if (
		configuration.autoAssignCustomDomains !== false ||
		configuration.targets?.production?.id !== required('PREVIOUS_DEPLOYMENT_ID')
	)
		throw new Error('Production configuration changed while approval was pending.');
	await smoke(verifiedOrigin(deployment), sha, true);
	await validateCommit();
	if ((await project()).targets?.production?.id !== required('PREVIOUS_DEPLOYMENT_ID'))
		throw new Error('Production changed during final smoke verification.');
	const record = await api<{ id: number }>('github', `/repos/${repository}/deployments`, 'POST', {
		ref: sha,
		environment: 'production',
		auto_merge: false,
		required_contexts: [],
		production_environment: true,
		payload: {
			vercelDeploymentId: deployment.id,
			previousDeploymentId: required('PREVIOUS_DEPLOYMENT_ID'),
		},
	});
	try {
		await api(
			'vercel',
			`/v10/projects/${configuration.id}/promote/${deployment.id}`,
			'POST',
			{},
		);
		// Promotion may re-enable domain assignment. Keep subsequent production builds staged.
		await api('vercel', `/v9/projects/${configuration.id}`, 'PATCH', {
			autoAssignCustomDomains: false,
		});
		await waitForLive(deployment.id);
		const origin = new URL(required('PRODUCTION_ORIGIN'));
		if (
			origin.protocol !== 'https:' ||
			origin.username ||
			origin.password ||
			origin.pathname !== '/' ||
			origin.search ||
			origin.hash
		)
			throw new Error('Invalid production origin.');
		await smoke(origin.origin, sha, false);
		await api('github', `/repos/${repository}/deployments/${record.id}/statuses`, 'POST', {
			state: 'success',
			environment_url: origin.origin,
		});
		await evidence({
			deployment: deployment.id,
			previous: required('PREVIOUS_DEPLOYMENT_ID'),
			state: 'production-verified',
		});
	} catch (error) {
		await evidence({
			deployment: deployment.id,
			previous: required('PREVIOUS_DEPLOYMENT_ID'),
			state: 'production-verification-failed',
		});
		await api('vercel', `/v9/projects/${configuration.id}`, 'PATCH', {
			autoAssignCustomDomains: false,
		});
		await api('github', `/repos/${repository}/deployments/${record.id}/statuses`, 'POST', {
			state: 'failure',
		});
		throw error;
	}
} else if (operation === 'rollback') {
	await requireApprovalEnvironment('production', true);
	const id = deploymentId(required('DEPLOYMENT_ID'));
	const records = await api<ReleaseRecord[]>(
		'github',
		`/repos/${repository}/deployments?environment=production&per_page=100`,
	);
	const current = records.find(
		(record) => record.payload?.vercelDeploymentId === configuration.targets?.production?.id,
	);
	if (!current || current.payload?.previousDeploymentId !== id)
		throw new Error(
			'Hobby rollback is restricted to the recorded previous production deployment.',
		);
	const prior = records.find((record) => record.payload?.vercelDeploymentId === id);
	if (!prior)
		throw new Error(
			'Previous release has no known-good verification record. Use the documented bootstrap recovery procedure.',
		);
	const statuses = await api<{ state: string }[]>(
		'github',
		`/repos/${repository}/deployments/${prior.id}/statuses`,
	);
	if (!statuses.some((status) => status.state === 'success') || prior.sha !== sha)
		throw new Error('Rollback target lacks successful verification or SHA correlation.');
	const deployment = await api<Deployment>('vercel', `/v13/deployments/${id}`);
	if (verifiedSource(deployment) !== sha || deployment.readyState !== 'READY')
		throw new Error('Rollback target is unavailable.');
	await smoke(verifiedOrigin(deployment), sha, true);
	const record = await api<{ id: number }>('github', `/repos/${repository}/deployments`, 'POST', {
		ref: sha,
		environment: 'production',
		auto_merge: false,
		required_contexts: [],
		production_environment: true,
		payload: {
			vercelDeploymentId: id,
			previousDeploymentId: configuration.targets?.production?.id,
			operation: 'rollback',
		},
	});
	try {
		await api('vercel', `/v1/projects/${configuration.id}/rollback/${id}`, 'POST', {});
		await api('vercel', `/v9/projects/${configuration.id}`, 'PATCH', {
			autoAssignCustomDomains: false,
		});
		await waitForLive(id);
		await smoke(required('PRODUCTION_ORIGIN'), sha, false);
		await api('github', `/repos/${repository}/deployments/${record.id}/statuses`, 'POST', {
			state: 'success',
			environment_url: required('PRODUCTION_ORIGIN'),
		});
		await evidence({ deployment: id, state: 'rollback-verified', database: 'unchanged' });
	} catch (error) {
		await evidence({
			deployment: id,
			state: 'rollback-verification-failed',
			database: 'unchanged',
		});
		await api('vercel', `/v9/projects/${configuration.id}`, 'PATCH', {
			autoAssignCustomDomains: false,
		});
		await api('github', `/repos/${repository}/deployments/${record.id}/statuses`, 'POST', {
			state: 'failure',
		});
		throw error;
	}
} else throw new Error('Unknown release operation.');
