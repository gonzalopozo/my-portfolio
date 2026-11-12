import { api, required } from './platform.mjs';
import {
	circlePages,
	isRepositoryPush,
	pipelineRevision,
	projectSlug,
	verifyPipeline,
	uuid,
	type Pipeline,
	type Workflow,
	type WorkflowJob,
} from './ci-context.mjs';

const gates = {
	'main-validation': [
		'quality',
		'tests',
		'migrations',
		'build',
		'dependencies',
		'secrets',
		'codeql',
	],
	'manual-validation': [
		'quality',
		'tests',
		'migrations',
		'build',
		'dependencies',
		'secrets',
		'codeql',
	],
	'security-scan': ['dependencies', 'secrets'],
	'codeql-scan': ['codeql'],
};

/** A successful PR, API run, or old scan cannot substitute for a fresh merged push. */
export async function validateRelease(sha: string) {
	const repository = required('GITHUB_REPOSITORY');
	const branch = await api<{ object: { sha: string } }>(
		'github',
		`/repos/${repository}/git/ref/heads/main`,
	);
	if (branch.object.sha !== sha) throw new Error('Release is stale: main has changed.');
	const pipelines = await circlePages<Pipeline>(
		`/api/v2/project/${projectSlug()}/pipeline?branch=main`,
	);
	const workflows: Workflow[] = [];
	for (const pipeline of pipelines.filter((value) => pipelineRevision(value) === sha)) {
		verifyPipeline(pipeline, sha);
		uuid(pipeline.id);
		const runs = await circlePages<Workflow>(`/api/v2/pipeline/${pipeline.id}/workflow`);
		for (const run of runs) {
			if (!Object.hasOwn(gates, run.name)) continue;
			if (
				run.pipeline_id !== pipeline.id ||
				run.project_slug !== projectSlug() ||
				!Number.isFinite(Date.parse(run.created_at)) ||
				Date.parse(run.created_at) > Date.now() + 300000
			)
				throw new Error('Validation workflow identity mismatch.');
			// main-validation is emitted only by the trusted push-event workflow definition.
			if (run.name === 'main-validation' && !isRepositoryPush(pipeline))
				throw new Error('Merged validation must originate from a repository push.');
			workflows.push(run);
		}
	}
	const ordered = workflows.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
	const successful = new Map<string, WorkflowJob[]>();
	async function requireSuccess(workflow: Workflow | undefined, requiredJobs: string[]) {
		const finished = Date.parse(workflow?.stopped_at ?? '');
		if (
			!workflow ||
			workflow.status !== 'success' ||
			!Number.isFinite(finished) ||
			finished < Date.parse(workflow.created_at) ||
			Date.now() - finished < -300000 ||
			Date.now() - finished >= 86400000
		)
			throw new Error('Missing fresh successful CircleCI validation.');
		let jobs = successful.get(workflow.id);
		if (!jobs) {
			jobs = await circlePages<WorkflowJob>(`/api/v2/workflow/${uuid(workflow.id)}/job`);
			successful.set(workflow.id, jobs);
		}
		for (const name of requiredJobs) {
			const matches = jobs.filter((job) => job.name === name && job.type !== 'approval');
			if (matches.length !== 1 || matches[0].status !== 'success')
				throw new Error(`A required CircleCI gate did not succeed: ${name}`);
			const stopped = Date.parse(matches[0].stopped_at ?? '');
			if (
				!Number.isFinite(stopped) ||
				Date.now() - stopped < -300000 ||
				Date.now() - stopped >= 86400000
			)
				throw new Error(`A required CircleCI gate is stale: ${name}`);
		}
	}
	await requireSuccess(
		ordered.find((workflow) => workflow.name === 'main-validation'),
		gates['main-validation'],
	);
	// A newer manual/scheduled failure blocks; a fresh rerun may supersede older scans.
	for (const name of gates['main-validation']) {
		const latest = ordered.find((workflow) =>
			gates[workflow.name as keyof typeof gates].includes(name),
		);
		await requireSuccess(latest, [name]);
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
