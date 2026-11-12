import { execFileSync } from 'node:child_process';
import { api, commit, required } from './platform.mjs';

export function uuid(value: string) {
	if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value))
		throw new Error('Invalid CircleCI identity.');
	return value;
}

export function ciIdentity() {
	const buildNumber = required('CIRCLE_BUILD_NUM');
	if (!/^[1-9][0-9]*$/.test(buildNumber)) throw new Error('Invalid CircleCI build number.');
	return {
		provider: 'circleci',
		workflowId: uuid(required('CIRCLE_WORKFLOW_ID')),
		pipelineId: uuid(required('CI_PIPELINE_ID')),
		buildNumber,
	};
}

/** Provider restrictions protect secret injection; these checks bind the executing checkout. */
export function assertMainController() {
	if (
		process.env.CIRCLECI !== 'true' ||
		process.env.CIRCLE_BRANCH !== 'main' ||
		process.env.CIRCLE_TAG
	)
		throw new Error('This operation requires the trusted CircleCI main controller.');
	const sha = commit(required('CIRCLE_SHA1'));
	if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== sha)
		throw new Error('Controller checkout does not match its immutable CircleCI SHA.');
	return sha;
}

export function projectSlug() {
	const slug = required('CIRCLECI_PROJECT_SLUG');
	// Copy the provider's opaque slug; its organization/project segments need not be UUIDs.
	const parts = slug.split('/');
	if (
		parts.length !== 3 ||
		parts[0] !== 'circleci' ||
		parts.slice(1).some((part) => !part || /[^A-Za-z0-9_-]/.test(part))
	)
		throw new Error('Use the configured GitHub App CircleCI project slug.');
	return slug;
}

export type Pipeline = {
	id: string;
	project_slug: string;
	vcs?: {
		branch: string;
		revision: string;
		origin_repository_url: string;
		target_repository_url?: string;
		tag?: string | null;
	} | null;
	trigger_parameters?: {
		git?: {
			branch: string;
			ref: string;
			checkout_sha: string;
			checkout_url: string;
			tag?: string | null;
		} | null;
		circleci?: { event_type: string; trigger_type: string } | null;
	} | null;
	trigger: { type: string };
};
export type Workflow = {
	id: string;
	name: string;
	pipeline_id: string;
	project_slug: string;
	status: string;
	created_at: string;
	stopped_at: string | null;
};
export type WorkflowJob = {
	id: string;
	name: string;
	type: string;
	status: string;
	approved_by?: string;
	stopped_at?: string;
};

export async function circlePages<T>(path: string) {
	const items: T[] = [];
	let token: string | undefined;
	for (let page = 0; page < 50; page++) {
		const separator = path.includes('?') ? '&' : '?';
		const result = await api<{ items: T[]; next_page_token?: string | null }>(
			'circleci',
			`${path}${token ? `${separator}page-token=${encodeURIComponent(token)}` : ''}`,
		);
		if (!Array.isArray(result.items)) throw new Error('Invalid CircleCI collection.');
		items.push(...result.items);
		if (!result.next_page_token) return items;
		token = result.next_page_token;
	}
	throw new Error('CircleCI metadata pagination exceeded its bound.');
}

/** GitHub App runs carry git metadata in trigger_parameters instead of vcs. */
export function pipelineRevision(pipeline: Pipeline) {
	const git = pipeline.trigger_parameters?.git;
	if (git && pipeline.vcs && git.checkout_sha !== pipeline.vcs.revision)
		throw new Error('CircleCI pipeline source identity is unproven: conflicting commits.');
	return git ? git.checkout_sha : pipeline.vcs?.revision;
}

export function isRepositoryPush(pipeline: Pipeline) {
	const trigger = pipeline.trigger_parameters?.circleci;
	if (pipeline.trigger_parameters?.git || trigger)
		return trigger?.trigger_type === 'github_app' && trigger.event_type === 'push';
	return pipeline.trigger.type === 'webhook';
}

export function verifyPipeline(pipeline: Pipeline, sha: string) {
	const repository = required('GITHUB_REPOSITORY');
	if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
		throw new Error('Invalid GitHub repository identity.');
	const origins = [`https://github.com/${repository}`, `https://github.com/${repository}.git`];
	const failures: string[] = [];
	if (pipeline.project_slug !== projectSlug()) failures.push('project');
	if (pipelineRevision(pipeline) !== sha) failures.push('commit');
	const vcs = pipeline.vcs;
	const git = pipeline.trigger_parameters?.git;
	if (!vcs && !git) failures.push('missing source metadata');
	// If both formats are present, every source claim must agree with trusted main.
	if (vcs) {
		if (vcs.branch !== 'main' || (vcs.tag != null && vcs.tag !== ''))
			failures.push('vcs branch');
		if (!origins.includes(vcs.origin_repository_url)) failures.push('origin repository');
		if (vcs.target_repository_url && !origins.includes(vcs.target_repository_url))
			failures.push('target repository');
	}
	if (git) {
		if (
			git.branch !== 'main' ||
			git.ref !== 'refs/heads/main' ||
			(git.tag != null && git.tag !== '')
		)
			failures.push('checkout branch');
		const checkouts = [...origins, `git@github.com:${repository}.git`];
		if (!checkouts.includes(git.checkout_url)) failures.push('checkout repository');
	}
	if (failures.length)
		throw new Error(
			`CircleCI pipeline source or project identity is unproven: ${failures.join(', ')}.`,
		);
}

export async function mainWorkflow(names: string[]) {
	const sha = assertMainController();
	const identity = ciIdentity();
	const workflow = await api<Workflow>('circleci', `/api/v2/workflow/${identity.workflowId}`);
	if (
		workflow.id !== identity.workflowId ||
		workflow.pipeline_id !== identity.pipelineId ||
		workflow.project_slug !== projectSlug() ||
		!names.includes(workflow.name)
	)
		throw new Error('Unexpected CircleCI controller workflow.');
	if (['release', 'rollback', 'baseline'].includes(workflow.name)) {
		if (process.env.CIRCLECI_RELEASES_ENABLED !== 'true')
			throw new Error(
				'Release activation requires the owner to enable CIRCLECI_RELEASES_ENABLED.',
			);
		const branch = await api<{ object: { sha: string } }>(
			'github',
			`/repos/${required('GITHUB_REPOSITORY')}/git/ref/heads/main`,
		);
		if (branch.object.sha !== sha) throw new Error('The main controller checkout is stale.');
	}
	const pipeline = await api<Pipeline>('circleci', `/api/v2/pipeline/${identity.pipelineId}`);
	if (pipeline.id !== identity.pipelineId) throw new Error('CircleCI pipeline ID mismatch.');
	verifyPipeline(pipeline, sha);
	return workflow;
}
