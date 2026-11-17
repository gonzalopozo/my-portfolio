import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => vi.fn());
vi.mock('../../scripts/production-harness.mjs', () => ({ productionHarness: harness }));
let previousArgv: string[];
beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	previousArgv = process.argv;
	process.argv = ['node', 'scripts/run-production-e2e.mts'];
	for (const name of [
		'CIRCLECI',
		'GITHUB_ACTIONS',
		'VERCEL',
		'CI',
		'APP_ENV',
		'PORTFOLIO_TEST_BUILD',
	])
		vi.stubEnv(name, undefined);
});
afterEach(() => {
	process.argv = previousArgv;
	vi.unstubAllEnvs();
});

describe('local-only browser entry point', () => {
	it.each([undefined, 'false', 'true'])(
		'runs the complete synthetic suite without changing CI=%s',
		async (ci) => {
			vi.stubEnv('CI', ci);
			await import('../../scripts/run-production-e2e.mjs');
			expect(harness).toHaveBeenCalledWith([]);
			expect(process.env.CI).toBe(ci);
			expect(process.env.APP_ENV).toBe('test');
			expect(process.env.PORTFOLIO_TEST_BUILD).toBe('true');
		},
	);
	it('forwards project selection, worker overrides and test filters unchanged', async () => {
		const arguments_ = ['--project=api', '--workers=1', '--grep', 'foreign origins'];
		process.argv.push(...arguments_);
		await import('../../scripts/run-production-e2e.mjs');
		expect(harness).toHaveBeenCalledWith(arguments_);
	});
	it('initializes the browser-free smoke entry point without fabricating CI', async () => {
		vi.stubEnv('CIRCLECI', 'true');
		await import('../../scripts/build-production.mjs');
		expect(harness).toHaveBeenCalledWith();
		expect(process.env.CI).toBeUndefined();
		expect(process.env.APP_ENV).toBe('test');
		expect(process.env.PORTFOLIO_TEST_BUILD).toBe('true');
	});
	it.each(['CIRCLECI', 'GITHUB_ACTIONS', 'VERCEL'])(
		'rejects browser execution in %s before starting a fixture',
		async (provider) => {
			vi.stubEnv(provider, 'true');
			await expect(import('../../scripts/run-production-e2e.mjs')).rejects.toThrow(
				'local only',
			);
			expect(harness).not.toHaveBeenCalled();
		},
	);
	it.each(['CIRCLECI', 'GITHUB_ACTIONS', 'VERCEL'])(
		'rejects direct test discovery in %s',
		async (provider) => {
			vi.stubEnv(provider, 'true');
			await expect(import('../../e2e/fixtures')).rejects.toThrow('never in hosted');
		},
	);
	it('propagates browser failure so a Git hook cannot continue', async () => {
		harness.mockRejectedValueOnce(new Error('Synthetic browser failure.'));
		await expect(import('../../scripts/run-production-e2e.mjs')).rejects.toThrow(
			'browser failure',
		);
	});
});
