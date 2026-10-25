import { defineConfig } from '@playwright/test';
import config from './playwright.config';

/** Remote acceptance uses a browser cookie bootstrap; no global bypass headers. */
export default defineConfig({
	...config,
	testMatch: 'csp.spec.ts',
	projects: config.projects
		?.filter((project) => project.name !== 'api')
		.map(({ name, use }) => ({ name, use })),
	workers: 1,
	webServer: undefined,
	use: { ...config.use, baseURL: process.env.CSP_TEST_BASE_URL, trace: 'off', screenshot: 'off' },
});
