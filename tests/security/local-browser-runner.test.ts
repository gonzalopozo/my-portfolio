import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => vi.fn());
vi.mock('../../scripts/production-harness.mjs', () => ({ productionHarness: harness }));
let previousArgv: string[];
beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	previousArgv = process.argv;
	process.argv = ['node', 'scripts/run-production-e2e.mts'];
	for (const name of ['CIRCLECI', 'GITHUB_ACTIONS', 'VERCEL', 'CI']) vi.stubEnv(name, undefined);
});
afterEach(() => {
	process.argv = previousArgv;
	vi.unstubAllEnvs();
});

describe('local-only browser entry point', () => {
	it('runs the complete suite with deterministic fixture settings', async () => {
		await import('../../scripts/run-production-e2e.mjs');
		expect(harness).toHaveBeenCalledWith([]);
		expect(process.env.CI).toBe('true');
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
	it('propagates browser failure so a Git hook cannot continue', async () => {
		harness.mockRejectedValueOnce(new Error('Synthetic browser failure.'));
		await expect(import('../../scripts/run-production-e2e.mjs')).rejects.toThrow(
			'browser failure',
		);
	});
});
