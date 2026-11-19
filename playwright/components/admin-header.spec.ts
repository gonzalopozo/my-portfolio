import { expect, test } from './fixtures';

test.describe.configure({ mode: 'parallel' });
test.use({ viewport: { width: 390, height: 700 } });

test('the mobile navigation sheet receives focus and closes when a route opens', async ({
	mount,
	page,
}) => {
	const story = await mount('admin-header');
	const trigger = story.getByRole('button', { name: 'Toggle menu' });
	await trigger.press('Enter');
	const sheet = page.getByRole('dialog');
	await expect(sheet).toBeVisible();
	await expect
		.poll(() => sheet.evaluate((element) => element.contains(document.activeElement)))
		.toBe(true);
	await sheet.getByRole('link', { name: 'Projects', exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/projects$/);
	await expect(page.getByRole('heading', { name: 'Gallery projects page' })).toBeVisible();
	await expect(sheet).toBeHidden();
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
