import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

test('public and login pages have no automated WCAG A/AA violations', async ({ page }) => {
	for (const path of ['/', '/login']) {
		await page.goto(path);
		const results = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(results.violations).toEqual([]);
	}
});

test('navigation errors remain recoverable', async ({ page }) => {
	const response = await page.goto('/this-route-does-not-exist');
	expect(response?.status()).toBe(404);
	await page.goto('/');
	await expect(page.getByRole('main')).toBeVisible();
});
