import { defineConfig, devices, type ReporterDescription } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const isolated = process.env.APP_ENV === 'test' && process.env.PORTFOLIO_TEST_BUILD === 'true';
const isCI =
	process.env.CI === 'true' || Boolean(process.env.CIRCLECI || process.env.GITHUB_ACTIONS);
const strict = isolated || isCI;
if (isolated && (process.env.VERCEL || baseURL !== 'https://localhost:3443'))
	throw new Error('Isolated Playwright requires the local production HTTPS harness.');
const reporters: ReporterDescription[] = [
	['list'],
	['html', { open: 'never' }],
	['junit', { outputFile: 'test-results/playwright.xml' }],
];
if (isolated) reporters.push(['json', { outputFile: 'test-results/playwright.json' }]);

export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: strict,
	failOnFlakyTests: strict,
	retries: strict ? 1 : 0,
	workers: 8,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	reporter: reporters,
	use: {
		baseURL,
		ignoreHTTPSErrors: isolated && baseURL === 'https://localhost:3443',
		trace: isolated ? 'on-first-retry' : 'off',
		screenshot: isolated ? 'only-on-failure' : 'off',
		video: 'off',
	},
	projects: [
		...(isolated ? [{ name: 'api', testMatch: 'api.spec.ts' }] : []),
		{
			name: 'chromium',
			testIgnore: 'api.spec.ts',
			testMatch: isolated ? '**/*.spec.ts' : ['public-responsive.spec.ts', 'public.spec.ts'],
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			testIgnore: 'api.spec.ts',
			testMatch: isolated ? '**/*.spec.ts' : ['public-responsive.spec.ts', 'public.spec.ts'],
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			testIgnore: 'api.spec.ts',
			testMatch: isolated ? '**/*.spec.ts' : ['public-responsive.spec.ts', 'public.spec.ts'],
			use: { ...devices['Desktop Safari'] },
		},
		{
			name: 'mobile-chromium',
			testIgnore: 'api.spec.ts',
			testMatch: isolated ? '**/*.spec.ts' : ['public-responsive.spec.ts', 'public.spec.ts'],
			use: { ...devices['Pixel 5'] },
		},
	],
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: 'pnpm dev',
				url: baseURL,
				reuseExistingServer: !isCI,
			},
});
