import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const origin = 'https://localhost:3443';
beforeEach(() => {
	vi.resetModules();
	for (const name of ['CI', 'CIRCLECI', 'GITHUB_ACTIONS', 'VERCEL', 'VERCEL_ENV'])
		vi.stubEnv(name, undefined);
	vi.stubEnv('APP_ENV', 'test');
	vi.stubEnv('PORTFOLIO_TEST_BUILD', 'true');
	vi.stubEnv('PLAYWRIGHT_BASE_URL', origin);
	vi.stubEnv('CSP_TEST_BASE_URL', origin);
	vi.stubEnv('BLOB_PUBLIC_HOSTNAME', 'https://fixture.public.blob.vercel-storage.com');
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe('production browser execution contract', () => {
	it.each([undefined, 'false', 'true'])(
		'keeps complete coverage and strict diagnostics independently of CI=%s',
		async (ci) => {
			vi.stubEnv('CI', ci);
			const { default: config } = await import('../../playwright.config');
			expect(config).toMatchObject({
				workers: 8,
				fullyParallel: false,
				forbidOnly: true,
				failOnFlakyTests: true,
				retries: 1,
				use: {
					baseURL: origin,
					ignoreHTTPSErrors: true,
					trace: 'on-first-retry',
					screenshot: 'only-on-failure',
					video: 'off',
				},
			});
			expect(config.webServer).toBeUndefined();
			expect(config.projects?.map((project) => project.name)).toEqual([
				'api',
				'chromium',
				'firefox',
				'webkit',
				'mobile-chromium',
			]);
			for (const project of config.projects ?? []) {
				expect(project.fullyParallel).not.toBe(true);
				expect(project.workers).toBeUndefined();
			}
			const [api, ...browsers] = config.projects ?? [];
			expect(api?.testMatch).toBe('api.spec.ts');
			for (const browser of browsers) {
				expect(browser.testMatch).toBe('**/*.spec.ts');
				expect(browser.testIgnore).toBe('api.spec.ts');
			}
			expect(config.reporter).toContainEqual([
				'json',
				{ outputFile: 'test-results/playwright.json' },
			]);
		},
	);

	it.each([undefined, 'http://localhost:3000', 'https://production.example.test'])(
		'refuses an isolated suite against %s',
		async (baseURL) => {
			vi.stubEnv('PLAYWRIGHT_BASE_URL', baseURL);
			await expect(import('../../playwright.config')).rejects.toThrow(
				'local production HTTPS',
			);
		},
	);

	it('retains public-only development checks without production intent', async () => {
		vi.stubEnv('APP_ENV', 'development');
		vi.stubEnv('PORTFOLIO_TEST_BUILD', undefined);
		vi.stubEnv('PLAYWRIGHT_BASE_URL', undefined);
		const { default: config } = await import('../../playwright.config');
		expect(config.retries).toBe(0);
		expect(config.forbidOnly).toBe(false);
		expect(config.failOnFlakyTests).toBe(false);
		expect(config.webServer).toMatchObject({ command: 'pnpm dev', reuseExistingServer: true });
		expect(config.projects).toHaveLength(4);
		for (const project of config.projects ?? [])
			expect(project.testMatch).toEqual(['public-responsive.spec.ts', 'public.spec.ts']);
	});

	it('keeps browser-free CI analysis able to load configuration', async () => {
		vi.stubEnv('CIRCLECI', 'true');
		vi.stubEnv('CI', 'true');
		vi.stubEnv('PORTFOLIO_TEST_BUILD', undefined);
		const { default: config } = await import('../../playwright.config');
		expect(config.forbidOnly).toBe(true);
		expect(config.failOnFlakyTests).toBe(true);
	});

	it('retains isolated build output and CPU limits without CI', async () => {
		const { default: config } = await import('../../next.config');
		expect(config.distDir).toBe('.ci/next-production');
		expect(config.experimental?.cpus).toBe(1);
	});

	it('does not select isolated build output in hosted deployments', async () => {
		vi.stubEnv('VERCEL', '1');
		const { default: config } = await import('../../next.config');
		expect(config.distDir).toBe('.next');
	});

	it('keeps hosted Preview acceptance strict, sequential and free of recordings', async () => {
		vi.stubEnv('APP_ENV', undefined);
		vi.stubEnv('PORTFOLIO_TEST_BUILD', undefined);
		const preview = 'https://portfolio-fixture.vercel.app';
		vi.stubEnv('CSP_TEST_BASE_URL', preview);
		vi.stubEnv('PLAYWRIGHT_BASE_URL', preview);
		const { default: config } = await import('../../playwright.csp.config');
		expect(config).toMatchObject({
			workers: 1,
			fullyParallel: false,
			forbidOnly: true,
			failOnFlakyTests: true,
			retries: 1,
			testMatch: 'csp.spec.ts',
			use: { baseURL: preview, trace: 'off', screenshot: 'off', video: 'off' },
		});
		expect(config.projects?.map((project) => project.name)).toEqual([
			'chromium',
			'firefox',
			'webkit',
			'mobile-chromium',
		]);
	});
});
