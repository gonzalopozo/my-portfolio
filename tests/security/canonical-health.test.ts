import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { smoke, waitForCanonicalHealth } from '../../scripts/smoke.mjs';

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

describe('canonical production HTTP smoke', () => {
	it('requests fresh health after convergence without sending protected credentials', async () => {
		vi.stubEnv('VERCEL_AUTOMATION_BYPASS_SECRET', 'synthetic-bypass');
		vi.stubEnv('HEALTH_READINESS_TOKEN', 'synthetic-readiness');
		fetch.mockImplementation(async (url, options) => {
			switch (new URL(String(url)).pathname) {
				case '/api/health':
					return healthyResponse(options?.cache === 'no-store' ? sha : 'b'.repeat(40));
				case '/':
					return new Response('<main id="main-content">Gonzalo Pozo</main>');
				case '/login':
					return new Response('<form>Login</form>');
				case '/api/auth/ok':
					return Response.json({ ok: true });
				default:
					throw new Error('Unexpected smoke path.');
			}
		});
		await waitForCanonicalHealth(origin, sha);
		await expect(smoke(origin, sha, false)).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledTimes(5);
		for (const [, options] of fetch.mock.calls) {
			const headers = new Headers(options?.headers);
			expect(headers.has('authorization')).toBe(false);
			expect(headers.has('x-vercel-protection-bypass')).toBe(false);
		}
	});

	it.each([
		{
			name: 'a different release',
			health: { status: 'ok', release: 'b'.repeat(40) },
			cacheControl: 'no-store',
			message: `Deployment health SHA mismatch (expected ${sha}; received ${'b'.repeat(40)}).`,
		},
		{
			name: 'a cacheable response',
			health: { status: 'ok', release: sha },
			cacheControl: 'public, max-age=60',
			message: 'Health response is missing Cache-Control: no-store.',
		},
		{
			name: 'an unhealthy status',
			health: { status: 'error', release: sha },
			cacheControl: 'no-store',
			message: 'Health endpoint did not report ok.',
		},
	])('rejects $name with a specific diagnosis', async ({ health, cacheControl, message }) => {
		fetch.mockResolvedValueOnce(
			Response.json(health, { headers: { 'cache-control': cacheControl } }),
		);
		await expect(smoke(origin, sha, false)).rejects.toThrow(message);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('omits arbitrary response values from health failure diagnostics', async () => {
		fetch.mockResolvedValueOnce(
			Response.json(
				{ status: 'ok', release: 'synthetic-private-value' },
				{ headers: { 'cache-control': 'no-store' } },
			),
		);
		const result = smoke(origin, sha, false);
		await expect(result).rejects.toThrow('received unrecognized');
		await expect(result).rejects.not.toThrow('synthetic-private-value');
	});
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
