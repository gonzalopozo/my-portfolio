import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const checkout = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ execFileSync: checkout }));
import { mainWorkflow, projectSlug, type Pipeline } from '../../scripts/ci-context.mjs';

const sha = 'a'.repeat(40);
const workflowId = '11111111-1111-4111-8111-111111111111';
const pipelineId = '22222222-2222-4222-8222-222222222222';
const slug = 'circleci/OrgExample123/ProjectExample456';
const fetch = vi.fn<typeof globalThis.fetch>();
let workflow: Record<string, unknown>;
let pipeline: Pipeline;
let source: { branch: string; revision: string; origin_repository_url: string };

function useGitHubAppSource(eventType = 'push') {
	const git = {
		branch: 'main',
		ref: 'refs/heads/main',
		tag: null as string | null,
		checkout_sha: sha,
		checkout_url: 'git@github.com:owner/portfolio.git',
	};
	pipeline.vcs = null;
	pipeline.trigger = { type: 'github_app' };
	pipeline.trigger_parameters = {
		git,
		circleci: { event_type: eventType, trigger_type: 'github_app' },
	};
	return git;
}

beforeEach(() => {
	vi.resetAllMocks();
	for (const [key, value] of Object.entries({
		CIRCLECI: 'true',
		CIRCLE_BRANCH: 'main',
		CIRCLE_SHA1: sha,
		CIRCLE_WORKFLOW_ID: workflowId,
		CI_PIPELINE_ID: pipelineId,
		CIRCLE_BUILD_NUM: '123',
		CIRCLECI_PROJECT_SLUG: slug,
		GITHUB_REPOSITORY: 'owner/portfolio',
		CIRCLECI_READ_TOKEN: 'synthetic-read-token',
		GITHUB_TOKEN: 'synthetic-github-token',
		CIRCLECI_RELEASES_ENABLED: 'true',
	}))
		vi.stubEnv(key, value);
	vi.stubEnv('CIRCLE_TAG', undefined);
	vi.stubGlobal('fetch', fetch);
	checkout.mockReturnValue(`${sha}\n`);
	workflow = { id: workflowId, pipeline_id: pipelineId, project_slug: slug, name: 'release' };
	source = {
		branch: 'main',
		revision: sha,
		origin_repository_url: 'https://github.com/owner/portfolio',
	};
	pipeline = {
		id: pipelineId,
		project_slug: slug,
		trigger: { type: 'webhook' },
		vcs: source,
	};
	fetch.mockImplementation(async (url) => {
		const path = url.toString();
		if (path.endsWith('/git/ref/heads/main')) return Response.json({ object: { sha } });
		return Response.json(path.includes('/workflow/') ? workflow : pipeline);
	});
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('CircleCI project slug', () => {
	it.each([
		slug,
		'circleci/33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444',
	])('preserves the configured opaque slug %s', (value) => {
		vi.stubEnv('CIRCLECI_PROJECT_SLUG', value);
		expect(projectSlug()).toBe(value);
	});
	it.each([
		'gh/owner/portfolio',
		'circleci/org',
		'circleci/org/project/extra',
		'circleci//project',
		'circleci/org/..',
		'circleci/org/project?other=value',
		'circleci/org/project#fragment',
		'circleci/org/project\n',
	])('rejects an invalid slug %s', (value) => {
		vi.stubEnv('CIRCLECI_PROJECT_SLUG', value);
		expect(() => projectSlug()).toThrow('project slug');
	});
});

describe('trusted CircleCI controller', () => {
	it('binds provider, checkout, workflow, pipeline and repository identities', async () => {
		await expect(mainWorkflow(['release'])).resolves.toMatchObject({ id: workflowId });
	});
	it.each([
		['CIRCLECI', 'false'],
		['CIRCLE_BRANCH', 'feature'],
		['CIRCLE_TAG', 'v1'],
	])('rejects an untrusted execution setting %s', async (key, value) => {
		vi.stubEnv(key, value);
		await expect(mainWorkflow(['release'])).rejects.toThrow('trusted');
		expect(fetch).not.toHaveBeenCalled();
	});
	it('rejects a changed checkout before accessing provider metadata', async () => {
		checkout.mockReturnValue(`${'b'.repeat(40)}\n`);
		await expect(mainWorkflow(['release'])).rejects.toThrow('checkout');
		expect(fetch).not.toHaveBeenCalled();
	});
	it.each(['id', 'pipeline_id', 'project_slug', 'name'])(
		'rejects mismatched workflow %s',
		async (field) => {
			workflow[field] = 'other';
			await expect(mainWorkflow(['release'])).rejects.toThrow('workflow');
		},
	);
	it.each(['branch', 'revision', 'origin_repository_url'] as const)(
		'rejects mismatched pipeline %s',
		async (field) => {
			source[field] = 'other';
			await expect(mainWorkflow(['release'])).rejects.toThrow('source');
		},
	);
	it.each([
		'git@github.com:owner/portfolio.git',
		'https://github.com/owner/portfolio',
		'https://github.com/owner/portfolio.git',
	])('accepts GitHub App source metadata with checkout %s', async (url) => {
		useGitHubAppSource().checkout_url = url;
		await expect(mainWorkflow(['release'])).resolves.toMatchObject({ id: workflowId });
	});
	it.each([
		['manual-validation', 'api'],
		['codeql-scan', 'schedule'],
	])('accepts verified main source for %s', async (name, event) => {
		useGitHubAppSource(event);
		workflow.name = name;
		await expect(mainWorkflow([name])).resolves.toMatchObject({ id: workflowId });
	});
	it.each(['branch', 'ref', 'tag', 'checkout_sha', 'checkout_url'] as const)(
		'rejects mismatched GitHub App %s',
		async (field) => {
			useGitHubAppSource()[field] = 'other';
			await expect(mainWorkflow(['release'])).rejects.toThrow('source');
		},
	);
	it.each(['ref', 'checkout_sha', 'checkout_url'])(
		'rejects missing GitHub App %s',
		async (field) => {
			Reflect.deleteProperty(useGitHubAppSource(), field);
			await expect(mainWorkflow(['release'])).rejects.toThrow('source');
		},
	);
	it.each([
		'git@github.com:fork/portfolio.git',
		'git@github.com.evil.test:owner/portfolio.git',
		'https://github.com/owner/portfolio.git?token=synthetic-secret',
		'https://github.com/owner/portfolio/extra',
	])('rejects an unexpected checkout repository without logging its URL', async (url) => {
		useGitHubAppSource().checkout_url = url;
		await expect(mainWorkflow(['release'])).rejects.toThrow(
			/^CircleCI pipeline source or project identity is unproven: checkout repository\.$/,
		);
	});
	it('rejects a GitHub App pipeline from a different project', async () => {
		useGitHubAppSource();
		pipeline.project_slug = 'circleci/OtherOrg/OtherProject';
		await expect(mainWorkflow(['release'])).rejects.toThrow('unproven: project');
	});
	it('rejects missing source metadata', async () => {
		pipeline.vcs = null;
		await expect(mainWorkflow(['release'])).rejects.toThrow('missing source metadata');
	});
	it('rejects conflicting commits when both metadata formats are present', async () => {
		useGitHubAppSource();
		pipeline.vcs = { ...source, revision: 'b'.repeat(40) };
		await expect(mainWorkflow(['release'])).rejects.toThrow('conflicting commits');
	});
	it('rejects a conflicting legacy repository even when the GitHub App source matches', async () => {
		useGitHubAppSource();
		pipeline.vcs = { ...source, origin_repository_url: 'https://github.com/fork/portfolio' };
		await expect(mainWorkflow(['release'])).rejects.toThrow('origin repository');
	});
	it('requires legacy target repository metadata to agree with the GitHub App checkout', async () => {
		useGitHubAppSource();
		pipeline.vcs = { ...source, target_repository_url: 'https://github.com/fork/portfolio' };
		await expect(mainWorkflow(['release'])).rejects.toThrow('target repository');
	});
	it('accepts consistent source claims when both metadata formats are present', async () => {
		useGitHubAppSource();
		pipeline.vcs = source;
		await expect(mainWorkflow(['release'])).resolves.toMatchObject({ id: workflowId });
	});
	it('rejects main changing while an owner approval is pending', async () => {
		fetch.mockResolvedValueOnce(Response.json(workflow));
		fetch.mockResolvedValueOnce(Response.json({ object: { sha: 'b'.repeat(40) } }));
		await expect(mainWorkflow(['release'])).rejects.toThrow('stale');
	});
	it('requires explicit owner activation', async () => {
		vi.stubEnv('CIRCLECI_RELEASES_ENABLED', 'false');
		await expect(mainWorkflow(['release'])).rejects.toThrow('activation');
	});
});
