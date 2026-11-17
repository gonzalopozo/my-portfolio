import { test as base, expect } from '@playwright/test';
import { getTestClientHeaders } from './fixture-support';

// Keep config imports available to browser-free analysis; reject actual test discovery here.
if (process.env.CIRCLECI || process.env.GITHUB_ACTIONS || process.env.VERCEL)
	throw new Error('Playwright tests run locally, never in hosted CI or deployments.');

export const test = base.extend<{ clientHeaders: Record<string, string> }>({
	clientHeaders: async ({ baseURL }, provideFixture, testInfo) => {
		if (process.env.APP_ENV === 'test' && process.env.PORTFOLIO_TEST_BUILD === 'true') {
			if (baseURL !== 'https://localhost:3443')
				throw new Error('Synthetic clients require the local production HTTPS harness.');
			await provideFixture(getTestClientHeaders(testInfo));
		} else {
			await provideFixture({});
		}
	},
	extraHTTPHeaders: async ({ extraHTTPHeaders, clientHeaders }, provideFixture) => {
		// Both the browser context and the independent API request fixture consume this option.
		await provideFixture({ ...extraHTTPHeaders, ...clientHeaders });
	},
	context: async ({ context, baseURL }, provideFixture) => {
		if (process.env.CSP_TEST_PREVIEW_BYPASS) {
			if (
				baseURL !== process.env.VERIFIED_PREVIEW_ORIGIN ||
				!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(baseURL ?? '')
			)
				throw new Error('Unverified Preview bypass destination.');
			const bootstrap = await context.request.get(baseURL!, {
				headers: {
					'x-vercel-protection-bypass': process.env.CSP_TEST_PREVIEW_BYPASS,
					'x-vercel-set-bypass-cookie': 'true',
				},
				maxRedirects: 0,
			});
			if (![200, 302, 303, 307].includes(bootstrap.status()))
				throw new Error('Preview bypass bootstrap failed.');
		}
		if (process.env.APP_ENV === 'test' && process.env.PORTFOLIO_TEST_BUILD === 'true') {
			const origin = new URL(baseURL!).origin;
			await context.route('**/*', async (route) => {
				const url = new URL(route.request().url());
				if (url.origin === origin || ['data:', 'blob:'].includes(url.protocol))
					return route.continue();
				if (url.hostname.endsWith('.cartocdn.com'))
					return route.fulfill({
						contentType: 'application/json',
						body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
					});
				throw new Error(`Unexpected browser network destination: ${url.origin}`);
			});
		}
		await provideFixture(context);
	},
});

export { expect };
