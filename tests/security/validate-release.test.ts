import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pipeline, Workflow, WorkflowJob } from '../../scripts/ci-context.mjs';
import { validateRelease } from '../../scripts/validate-release.mjs';

const sha = 'a'.repeat(40);
const pipelineId = '11111111-1111-4111-8111-111111111111';
const workflowId = '22222222-2222-4222-8222-222222222222';
const slug = 'circleci/33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444';
const fetch = vi.fn<typeof globalThis.fetch>();
let pipeline: Pipeline;
let runs: Workflow[];
let jobs: WorkflowJob[];
let main: string;
let alerts: { rule: { severity: string; security_severity_level?: string } }[];

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubEnv('GITHUB_REPOSITORY', 'owner/portfolio');
	vi.stubEnv('GITHUB_TOKEN', 'synthetic-github-token');
	vi.stubEnv('CIRCLECI_PROJECT_SLUG', slug);
	vi.stubEnv('CIRCLECI_READ_TOKEN', 'synthetic-read-token');
	vi.stubGlobal('fetch', fetch);
	main = sha;
	alerts = [];
	pipeline = {
		id: pipelineId,
		project_slug: slug,
		trigger: { type: 'webhook' },
		vcs: {
			branch: 'main',
			revision: sha,
			origin_repository_url: 'https://github.com/owner/portfolio',
		},
	};
	runs = [
		{
			id: workflowId,
			pipeline_id: pipelineId,
			project_slug: slug,
			name: 'main-validation',
			status: 'success',
			created_at: new Date(Date.now() - 60000).toISOString(),
			stopped_at: new Date(Date.now() - 1000).toISOString(),
		},
	];
	jobs = ['quality', 'tests', 'migrations', 'build', 'dependencies', 'secrets', 'codeql'].map(
		(name) => ({
			id: workflowId,
			name,
			type: 'build',
			status: 'success',
			stopped_at: new Date(Date.now() - 1000).toISOString(),
		}),
	);
	fetch.mockImplementation(async (url) => {
		const path = new URL(url.toString()).pathname;
		if (path.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha: main } });
		if (path.endsWith('/code-scanning/alerts')) return Response.json(alerts);
		if (path.endsWith('/pipeline')) return Response.json({ items: [pipeline] });
		if (path.endsWith('/workflow')) return Response.json({ items: runs });
		if (path.endsWith('/job')) return Response.json({ items: jobs });
		throw new Error('Unexpected fixture request.');
	});
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('merged-commit release gates', () => {
	it('accepts fresh main push results with every required gate', async () => {
		await expect(validateRelease(sha)).resolves.toBeUndefined();
	});
	it('rejects a changed main SHA', async () => {
		main = 'b'.repeat(40);
		await expect(validateRelease(sha)).rejects.toThrow('main has changed');
	});
	it('rejects PR success as a replacement for merged validation', async () => {
		runs[0].name = 'pr-validation';
		await expect(validateRelease(sha)).rejects.toThrow('validation');
	});
	it('rejects an API run masquerading as a main push', async () => {
		pipeline.trigger.type = 'api';
		await expect(validateRelease(sha)).rejects.toThrow('repository push');
	});
	it.each(['failed', 'canceled', 'not_run', 'running', 'unauthorized'])(
		'rejects a required job with status %s',
		async (status) => {
			jobs[0].status = status;
			await expect(validateRelease(sha)).rejects.toThrow('required CircleCI gate');
		},
	);
	it('rejects a missing gate even if the workflow is successful', async () => {
		jobs.pop();
		await expect(validateRelease(sha)).rejects.toThrow('codeql');
	});
	it('rejects stale validation', async () => {
		runs[0].stopped_at = new Date(Date.now() - 86400001).toISOString();
		await expect(validateRelease(sha)).rejects.toThrow('fresh');
	});
	it('rejects an old reused job inside a recently completed workflow', async () => {
		jobs[0].stopped_at = new Date(Date.now() - 86400001).toISOString();
		await expect(validateRelease(sha)).rejects.toThrow('gate is stale');
	});
	it('rejects a newer pending or failed security scan', async () => {
		runs.push({
			...runs[0],
			id: pipelineId,
			name: 'codeql-scan',
			status: 'running',
			created_at: new Date().toISOString(),
			stopped_at: null,
		});
		await expect(validateRelease(sha)).rejects.toThrow('fresh');
	});
	it('allows fresh merged validation to supersede an older scheduled failure', async () => {
		runs.push({
			...runs[0],
			id: pipelineId,
			name: 'codeql-scan',
			status: 'failed',
			created_at: new Date(Date.now() - 120000).toISOString(),
		});
		await expect(validateRelease(sha)).resolves.toBeUndefined();
	});
	it.each(['high', 'critical'])('rejects open %s code-scanning findings', async (severity) => {
		alerts = [{ rule: { severity: 'warning', security_severity_level: severity } }];
		await expect(validateRelease(sha)).rejects.toThrow('blocking code scanning');
	});
});
