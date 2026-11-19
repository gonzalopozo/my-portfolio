import { expect, test } from './fixtures';

test.describe.configure({ mode: 'parallel' });

test('keyboard navigation selects an icon from the catalog and restores trigger focus', async ({
	mount,
	page,
}) => {
	const story = await mount('icon-picker');
	const trigger = story.getByRole('combobox', { name: 'Select an icon' });
	await expect(trigger).toBeEnabled();
	await trigger.press('Enter');
	const search = page.getByPlaceholder('Search icons…');
	await expect(search).toBeFocused();
	await search.fill('BiAlarm');
	const options = page.getByRole('option');
	const second = options.nth(1);
	await expect(second).toBeVisible();
	await search.press('Home');
	await expect(options.first()).toHaveAttribute('aria-selected', 'true');
	await search.press('ArrowDown');
	await expect(second).toHaveAttribute('aria-selected', 'true');
	const [name] = (await second.innerText()).trim().split(/\s+/);
	await search.press('Enter');
	await expect(search).toBeHidden();
	await expect(story.getByRole('combobox', { name: `Selected icon: ${name}` })).toBeFocused();
});
