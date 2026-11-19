import { expect, test } from './fixtures';

test.describe.configure({ mode: 'parallel' });

test('keyboard switching runs a native view transition and can switch back', async ({
	mount,
	page,
	tabKey,
}) => {
	const card = await mount('bb8-theme-switcher');
	const switcher = card.getByRole('switch');
	const html = page.locator('html');
	const nativeTransition = page.locator('html:active-view-transition');
	await expect(html).toHaveClass(/\blight\b/);
	await expect(switcher).toBeEnabled();
	await page.keyboard.press(tabKey);
	await expect(switcher).toBeFocused();
	const lightBackground = await page.locator('body').evaluate((body) => {
		return getComputedStyle(body).backgroundColor;
	});

	await page.keyboard.press('Space');
	await expect(nativeTransition).toHaveCount(1);
	await expect(html).toHaveClass(/\bdark\b/);
	await expect(nativeTransition).toHaveCount(0);
	await expect(page.locator('html[data-bb8-theme-reveal]')).toHaveCount(0);
	await expect(page.locator('body')).not.toHaveCSS('background-color', lightBackground);
	await expect(switcher).toBeChecked();
	await expect(switcher).toBeFocused();

	await page.keyboard.press('Space');
	await expect(html).toHaveClass(/\blight\b/);
	await expect(nativeTransition).toHaveCount(0);
	await expect(page.locator('body')).toHaveCSS('background-color', lightBackground);
});

test('reduced motion changes the rendered theme without a native transition', async ({
	mount,
	page,
	tabKey,
}) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const card = await mount('bb8-theme-switcher');
	const html = page.locator('html');
	await expect(html).toHaveClass(/\blight\b/);
	const body = page.locator('body');
	const lightBackground = await body.evaluate(
		(element) => getComputedStyle(element).backgroundColor,
	);

	const switcher = card.getByRole('switch');
	await expect(switcher).toBeEnabled();
	await page.keyboard.press(tabKey);
	await expect(switcher).toBeFocused();
	const renderedTransition = await page.evaluateHandle(() => {
		const state = { seen: false };
		function observeFrame() {
			state.seen = document.documentElement.matches(':active-view-transition');
			if (!state.seen) requestAnimationFrame(observeFrame);
		}
		observeFrame();
		return state;
	});
	await page.keyboard.press('Space');
	await expect(switcher).toBeChecked();
	await expect(html).toHaveClass(/\bdark\b/);
	await expect(body).not.toHaveCSS('background-color', lightBackground);
	expect(await renderedTransition.jsonValue()).toEqual({ seen: false });
	await expect(page.locator('html[data-bb8-theme-reveal]')).toHaveCount(0);
});
