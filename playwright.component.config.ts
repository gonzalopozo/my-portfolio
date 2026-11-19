// cspell:ignore swiftshader
import { defineConfig, devices } from '@playwright/test';

const galleryURL = 'http://127.0.0.1:3100';

export default defineConfig({
	testDir: './playwright/components',
	fullyParallel: false,
	workers: 8,
	retries: 1,
	failOnFlakyTests: true,
	forbidOnly: true,
	outputDir: '.ci/component-results',
	reporter: [['list'], ['html', { outputFolder: '.ci/component-report', open: 'never' }]],
	use: {
		baseURL: galleryURL,
		colorScheme: 'light',
		reducedMotion: 'no-preference',
		serviceWorkers: 'block',
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'components-chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: {
					args: [
						'--use-gl=angle',
						'--use-angle=swiftshader-webgl',
						'--enable-unsafe-swiftshader',
					],
				},
			},
		},
		{
			name: 'components-firefox',
			testIgnore: '**/*.chromium.spec.ts',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'components-webkit',
			testIgnore: '**/*.chromium.spec.ts',
			use: { ...devices['Desktop Safari'] },
		},
	],
	webServer: {
		command: 'pnpm exec tsx scripts/run-component-gallery.mts',
		url: galleryURL,
		reuseExistingServer: false,
		timeout: 180_000,
		gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
		stdout: 'ignore',
		stderr: 'pipe',
	},
});
