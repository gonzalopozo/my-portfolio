import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	api,
	commit,
	deploymentId,
	verifiedOrigin,
	type Deployment,
} from '../../scripts/platform.mjs';

beforeEach(() => {
	vi.stubEnv('VERCEL_PROJECT_ID', 'prj_fixture');
	vi.stubEnv('VERCEL_TOKEN', 'synthetic-platform-token');
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});
const deployment: Deployment = {
	id: 'dpl_fixture',
	projectId: 'prj_fixture',
	url: 'fixture-123.vercel.app',
	readyState: 'READY',
	createdAt: 0,
};

describe('release trust boundaries', () => {
	it('requires immutable SHA and validated deployment identifiers', () => {
		expect(commit('a'.repeat(40))).toBe('a'.repeat(40));
		expect(() => commit('main')).toThrow();
		expect(() => commit('abc123')).toThrow();
		expect(() => deploymentId('dpl_fixture\nattack')).toThrow();
	});
	it.each([
		'fixture.vercel.app.evil.test',
		'user:password@fixture.vercel.app',
		'fixture.vercel.app/private',
		'fixture.vercel.app?token=secret',
		'fixture.vercel.app:8443',
	])('rejects ambiguous or external origins', (url) => {
		expect(() => verifiedOrigin({ ...deployment, url })).toThrow();
	});
	it('accepts only the selected project origin', () => {
		expect(verifiedOrigin(deployment)).toBe('https://fixture-123.vercel.app');
		expect(() => verifiedOrigin({ ...deployment, projectId: 'prj_other' })).toThrow();
	});
	it('does not send a token to an arbitrary platform URL', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		await expect(api('vercel', 'https://attacker.invalid/path')).rejects.toThrow('origin');
		expect(fetch).not.toHaveBeenCalled();
	});
	it('refuses redirects and omits upstream error bodies', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(
			async () => new Response('private upstream token', { status: 403 }),
		);
		vi.stubGlobal('fetch', fetch);
		const request = api('vercel', '/v9/projects/prj_fixture');
		await expect(request).rejects.toThrow('403');
		expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: 'error' });
		await expect(request).rejects.not.toThrow('private upstream token');
	});
});
