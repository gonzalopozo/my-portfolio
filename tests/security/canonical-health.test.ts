import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForCanonicalHealth } from '../../scripts/smoke.mjs';

const origin = 'https://portfolio.example.test';
const sha = 'a'.repeat(40);
const fetch = vi.fn<typeof globalThis.fetch>();

function healthyResponse(release = sha) {
	return Response.json({ status: 'ok', release }, { headers: { 'cache-control': 'no-store' } });
}

beforeEach(() => {
	vi.useFakeTimers();
	fetch.mockReset();
	vi.stubGlobal('fetch', fetch);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('canonical production health convergence', () => {
	it('waits for a temporarily missing route to serve the approved release', async () => {
		fetch
			.mockResolvedValueOnce(new Response(null, { status: 404 }))
			.mockResolvedValueOnce(healthyResponse());
		await Promise.all([
			expect(waitForCanonicalHealth(origin, sha)).resolves.toBeUndefined(),
			vi.runAllTimersAsync(),
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('waits for the previous release to be replaced on the public domain', async () => {
		fetch
			.mockResolvedValueOnce(healthyResponse('b'.repeat(40)))
			.mockResolvedValueOnce(healthyResponse());
		await Promise.all([
			expect(waitForCanonicalHealth(origin, sha)).resolves.toBeUndefined(),
			vi.runAllTimersAsync(),
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('requires an uncached response before accepting the release', async () => {
		fetch
			.mockResolvedValueOnce(Response.json({ status: 'ok', release: sha }))
			.mockResolvedValueOnce(healthyResponse());
		await Promise.all([
			expect(waitForCanonicalHealth(origin, sha)).resolves.toBeUndefined(),
			vi.runAllTimersAsync(),
		]);
		expect(fetch).toHaveBeenCalledTimes(2);
	});

	it('recovers from a transient connection failure during routing changes', async () => {
		fetch
			.mockRejectedValueOnce(new TypeError('Synthetic connection failure'))
			.mockResolvedValueOnce(healthyResponse());
		await Promise.all([
			expect(waitForCanonicalHealth(origin, sha)).resolves.toBeUndefined(),
			vi.runAllTimersAsync(),
		]);
	});

	it('fails after two minutes if the expected release never becomes available', async () => {
		fetch.mockImplementation(async () => healthyResponse('b'.repeat(40)));
		await Promise.all([
			expect(waitForCanonicalHealth(origin, sha)).rejects.toThrow(
				'Canonical production health did not converge to the expected release.',
			),
			vi.advanceTimersByTimeAsync(120000),
		]);
	});

	it('keeps redirects on the configured origin and sends no protected credentials', async () => {
		vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', 'synthetic-bypass');
		vi.stubEnv('HEALTH_READINESS_TOKEN', 'synthetic-readiness');
		fetch
			.mockResolvedValueOnce(
				new Response(null, {
					status: 307,
					headers: { location: 'https://other.example.test/api/health' },
				}),
			)
			.mockResolvedValueOnce(healthyResponse());
		await Promise.all([
			expect(waitForCanonicalHealth(origin, sha)).resolves.toBeUndefined(),
			vi.runAllTimersAsync(),
		]);
		for (const [url, options] of fetch.mock.calls) {
			expect(String(url)).toBe(`${origin}/api/health`);
			expect(options).toMatchObject({ redirect: 'manual', cache: 'no-store' });
			const headers = new Headers(options?.headers);
			expect(headers.has('authorization')).toBe(false);
			expect(headers.has('x-vercel-protection-bypass')).toBe(false);
		}
	});

	it.each([
		'http://portfolio.example.test',
		'https://user:password@portfolio.example.test',
		'https://portfolio.example.test/private',
		'https://portfolio.example.test?token=secret',
		'https://portfolio.example.test#fragment',
		'https://portfolio.example.test:8443',
		'not-a-url',
	])('rejects an invalid production origin before requesting it: %s', async (url) => {
		await expect(waitForCanonicalHealth(url, sha)).rejects.toThrow(
			'Invalid production origin.',
		);
		expect(fetch).not.toHaveBeenCalled();
	});
});
