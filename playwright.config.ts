import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const isolated = process.env.CI === 'true' && process.env.APP_ENV === 'test';
export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	failOnFlakyTests: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	timeout: 45_000,
	expect: { timeout: 10_000 },
	reporter: [
		['list'],
		['html', { open: 'never' }],
		['junit', { outputFile: 'test-results/playwright.xml' }],
	],
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
				reuseExistingServer: !process.env.CI,
			},
});
