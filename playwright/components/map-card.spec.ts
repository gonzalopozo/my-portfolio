import { expect, test } from './fixtures';
import { bounds, fitsWithin } from './geometry';

test.describe.configure({ mode: 'parallel' });

test('the desktop map story stays inside its card and returns focus on close', async ({
	mount,
}) => {
	const story = await mount('map-card');
	const card = story.locator('[data-slot="card"]');
	const marker = card.getByRole('button', { name: 'Map marker' });
	await marker.click();
	const panel = card.locator('[data-arroyomolinos-panel]');
	await expect(panel.getByRole('heading', { name: 'Arroyomolinos, Madrid' })).toBeVisible();
	expect(fitsWithin(await bounds(panel), await bounds(card))).toBe(true);
	await panel.getByRole('button', { name: 'Cerrar historia de Arroyomolinos' }).click();
	await expect(panel).toBeHidden();
	await expect(marker).toBeFocused();
});
