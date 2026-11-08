import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { previewReference, verifyPreview } from '../../scripts/preview-controller.mjs';

const sha = 'a'.repeat(40);
const fetch = vi.fn<typeof globalThis.fetch>();
beforeEach(() => {
	vi.resetAllMocks();
	vi.stubGlobal('fetch', fetch);
	vi.stubEnv('GITHUB_REPOSITORY', 'owner/portfolio');
	vi.stubEnv('GITHUB_REPOSITORY_ID', '123');
	vi.stubEnv('GITHUB_TOKEN', 'synthetic-read-token');
	vi.stubEnv('VERCEL_TOKEN', 'synthetic-vercel-token');
	vi.stubEnv('VERCEL_PROJECT_ID', 'prj_fixture');
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});
function event(url = 'https://fixture.vercel.app') {
	return {
		repository: { id: 123, full_name: 'owner/portfolio' },
		deployment: { sha, environment: 'Preview' },
		deployment_status: { state: 'success', environment_url: url },
	};
}

describe('Preview webhook provenance', () => {
	it('ignores ping and unsuccessful/non-Preview events', () => {
		expect(previewReference('{}')).toBeUndefined();
		const payload = event();
		payload.deployment_status.state = 'pending';
		expect(previewReference(JSON.stringify(payload))).toBeUndefined();
		payload.deployment_status.state = 'success';
		payload.deployment.environment = 'Production';
		expect(previewReference(JSON.stringify(payload))).toBeUndefined();
	});
	it('accepts the bounded owned deployment reference', () => {
		expect(previewReference(JSON.stringify(event()))).toEqual({
			id: 'fixture.vercel.app',
			sha,
		});
	});
	it('rejects a different repository', () => {
		const payload = event();
		payload.repository.id = 456;
		expect(() => previewReference(JSON.stringify(payload))).toThrow('repository');
	});
	it.each([
		'http://fixture.vercel.app',
		'https://fixture.vercel.app.evil.test',
		'https://fixture.vercel.app:8443',
		'https://fixture.vercel.app/private',
		'https://fixture.vercel.app?secret=value',
	])('rejects unsafe origin %s', (url) => {
		expect(() => previewReference(JSON.stringify(event(url)))).toThrow();
	});
	it('accepts a recent Ready Preview at an owned repository branch head', async () => {
		fetch
			.mockResolvedValueOnce(
				Response.json({
					id: 'dpl_fixture',
					projectId: 'prj_fixture',
					readyState: 'READY',
					url: 'fixture.vercel.app',
					createdAt: Date.now(),
					meta: { githubRepoId: '123', githubCommitSha: sha },
				}),
			)
			.mockResolvedValueOnce(Response.json([{ name: 'feature' }]));
		await expect(verifyPreview('dpl_fixture', sha)).resolves.toMatchObject({ sha });
	});
	it.each(['project', 'state', 'source', 'age'])(
		'rejects mismatched Preview %s before looking up branch ownership',
		async (field) => {
			fetch.mockResolvedValueOnce(
				Response.json({
					id: 'dpl_fixture',
					projectId: field === 'project' ? 'prj_other' : 'prj_fixture',
					readyState: field === 'state' ? 'ERROR' : 'READY',
					url: 'fixture.vercel.app',
					createdAt: field === 'age' ? 0 : Date.now(),
					meta: {
						githubRepoId: '123',
						githubCommitSha: field === 'source' ? 'b'.repeat(40) : sha,
					},
				}),
			);
			await expect(verifyPreview('dpl_fixture', sha)).rejects.toThrow();
			expect(fetch).toHaveBeenCalledTimes(1);
		},
	);
	it('rejects a fork-only Preview before any smoke request', async () => {
		fetch
			.mockResolvedValueOnce(
				Response.json({
					id: 'dpl_fixture',
					projectId: 'prj_fixture',
					readyState: 'READY',
					url: 'fixture.vercel.app',
					createdAt: Date.now(),
					meta: { githubRepoId: '123', githubCommitSha: sha },
				}),
			)
			.mockResolvedValueOnce(Response.json([]));
		await expect(verifyPreview('dpl_fixture', sha)).rejects.toThrow('Fork-only');
		expect(fetch).toHaveBeenCalledTimes(2);
	});
});
