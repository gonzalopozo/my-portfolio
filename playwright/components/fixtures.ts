// cspell:ignore blockedbyclient
import { expect, test as base } from '@playwright/test';
import { galleryReadyEvent } from '../gallery/contract';
import { mapStyles } from './map-styles';

if (process.env.VERCEL || process.env.CIRCLECI || process.env.GITHUB_ACTIONS) {
	throw new Error('Playwright component tests run locally.');
}

export const test = base.extend<{ tabKey: 'Tab' | 'Alt+Tab' }>({
	context: async ({ context, baseURL }, provideFixture) => {
		if (!baseURL) throw new Error('The component tests require the local gallery URL.');
		const galleryOrigin = new URL(baseURL).origin;
		const unexpectedRequests: string[] = [];
		await context.route('**/*', async (route) => {
			const url = new URL(route.request().url());
			if (
				url.origin === galleryOrigin ||
				url.protocol === 'blob:' ||
				url.protocol === 'data:'
			) {
				await route.continue();
			} else if (Object.hasOwn(mapStyles, url.href)) {
				await route.fulfill({
					json: mapStyles[url.href],
					headers: { 'access-control-allow-origin': galleryOrigin },
				});
			} else {
				unexpectedRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`);
				await route.abort('blockedbyclient');
			}
		});
		try {
			await provideFixture(context);
		} finally {
			expect(unexpectedRequests, 'Unexpected requests from the component gallery').toEqual(
				[],
			);
		}
	},
	page: async ({ page }, provideFixture) => {
		await page.addInitScript((readyEvent) => {
			// Playwright calls mount as soon as navigation finishes, which can precede hydration.
			const ready = new Promise<NonNullable<Window['portfolioGallery']>>((resolve) => {
				window.addEventListener(readyEvent, () => resolve(window.portfolioGallery!), {
					once: true,
				});
			});
			window.mount = async (request) => (await ready).mount(request);
			window.unmount = async () => (await ready).unmount();
		}, galleryReadyEvent);
		await provideFixture(page);
	},
	tabKey: async ({ browserName, page }, provideFixture) => {
		let tabKey: 'Tab' | 'Alt+Tab' = 'Tab';
		if (browserName === 'webkit' && process.platform === 'darwin') {
			// On macOS, Option+Tab reverses WebKit's preference for including links.
			// https://github.com/microsoft/playwright/issues/5609
			await page.setContent('<input aria-label="Start"><a href="#next">Next link</a>');
			await page.getByRole('textbox', { name: 'Start' }).focus();
			await page.keyboard.press('Tab');
			const linkFocused = await page
				.getByRole('link', { name: 'Next link' })
				.evaluate((link) => link === document.activeElement);
			if (!linkFocused) tabKey = 'Alt+Tab';
		}
		await provideFixture(tabKey);
	},
});

export { expect };
