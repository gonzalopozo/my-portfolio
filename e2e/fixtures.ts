import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ networkIsolation: void }>({
	networkIsolation: [
		async ({ context, baseURL }, use, testInfo) => {
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
			if (process.env.APP_ENV === 'test') {
				const hash = Array.from(testInfo.titlePath.join('/')).reduce(
					(value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
					0,
				);
				// Independent synthetic clients exercise the real limiter without sharing one CI IP.
				await context.setExtraHTTPHeaders({
					'x-forwarded-for': `198.18.${hash % 256}.${(hash >>> 8) % 256}`,
				});
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
			await use();
		},
		{ auto: true },
	],
});

export { expect };
