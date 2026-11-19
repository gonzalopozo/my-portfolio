import { expect, test } from './fixtures';
import { mapStyleURLs } from './map-styles';

test.describe.configure({ mode: 'parallel' });

test('the real map starts a worker, renders a canvas and loads the dark style on theme change', async ({
	mount,
	page,
}) => {
	const [lightResponse, story] = await Promise.all([
		page.waitForResponse(mapStyleURLs.light),
		mount('location-map'),
	]);
	expect(lightResponse.ok()).toBe(true);
	await expect.poll(() => page.workers().length).toBeGreaterThan(0);
	const readiness = story.getByRole('status', { name: 'Map readiness' });
	await expect(readiness).toHaveText('Ready');
	await expect(story.locator('canvas')).toBeVisible();
	const [darkResponse] = await Promise.all([
		page.waitForResponse(mapStyleURLs.dark),
		story.getByRole('button', { name: 'Set dark map theme' }).click(),
	]);
	expect(darkResponse.ok()).toBe(true);
	await expect(story.getByRole('status', { name: 'Loaded map theme' })).toHaveText('dark');
	await expect(readiness).toHaveText('Ready');
	await expect(story.locator('canvas')).toBeVisible();
});
