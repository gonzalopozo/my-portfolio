import { expect, test } from './fixtures';

test.describe.configure({ mode: 'parallel' });

test('keyboard selection and Escape preserve both skill IDs when the form is submitted', async ({
	mount,
	page,
	tabKey,
}) => {
	const story = await mount('skills-multi-select');
	const trigger = story.getByRole('combobox', { name: 'Select skills' });
	await trigger.press('Enter');
	const search = page.getByRole('combobox', { name: 'Search skills' });
	await expect(search).toBeFocused();
	for (const skill of ['React', 'TypeScript']) {
		await search.fill(skill);
		await expect(page.getByRole('option', { name: skill, exact: true })).toBeVisible();
		await search.press('Home');
		await search.press('Enter');
		await expect(trigger.getByText(skill, { exact: true })).toBeVisible();
	}
	await search.press('Escape');
	await expect(search).toBeHidden();
	await expect(trigger).toBeFocused();
	await page.keyboard.press(tabKey);
	await expect(trigger.getByRole('button', { name: 'Clear selection' })).toBeFocused();
	await page.keyboard.press(tabKey);
	await expect(story.getByRole('button', { name: 'Submit skills' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(story.getByRole('status')).toHaveText('["21","34"]');
});

test('clearing a selection by pointer keeps the list closed and submits no skill IDs', async ({
	mount,
	page,
}) => {
	const story = await mount('skills-multi-select');
	const trigger = story.getByRole('combobox', { name: 'Select skills' });
	await trigger.click();
	await page.getByRole('option', { name: 'CSS', exact: true }).click();
	await page.keyboard.press('Escape');
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await trigger.getByRole('button', { name: 'Clear selection' }).click();
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByRole('combobox', { name: 'Search skills' })).toBeHidden();
	await story.getByRole('button', { name: 'Submit skills' }).click();
	await expect(story.getByRole('status')).toHaveText('[]');
});
