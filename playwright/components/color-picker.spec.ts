import { expect, test } from './fixtures';
import { bounds, fitsWithin } from './geometry';

test.describe.configure({ mode: 'parallel' });

test('dragging across the saturation and brightness area moves the thumb and updates the color', async ({
	mount,
	page,
}) => {
	const story = await mount('color-picker');
	await story.getByRole('button', { name: /Color, actual/ }).click();
	const dialog = page.getByRole('dialog');
	const area = dialog.getByRole('group', { name: /Saturación y brillo/ });
	const thumb = area.locator('[role="presentation"]');
	const hex = dialog.getByRole('textbox', { name: 'Hex' });
	await thumb.hover();
	const before = await bounds(thumb);
	const initialValue = await hex.inputValue();
	const areaBox = await bounds(area);
	await page.mouse.down();
	await page.mouse.move(areaBox.x + areaBox.width * 0.24, areaBox.y + areaBox.height * 0.75, {
		steps: 10,
	});
	await page.mouse.up();
	await expect(hex).not.toHaveValue(initialValue);
	const after = await bounds(thumb);
	expect(after.x).toBeLessThan(before.x - 10);
	expect(after.y).toBeGreaterThan(before.y + 10);
	await expect(
		dialog.getByRole('img', { name: `Vista previa del color ${await hex.inputValue()}` }),
	).toBeVisible();
});

test('the color popover fits above a trigger at the lower-right viewport edge', async ({
	mount,
	page,
}) => {
	const viewport = { width: 340, height: 580 };
	await page.setViewportSize(viewport);
	const story = await mount('color-picker-edge');
	const trigger = story.getByRole('button', { name: /Color, actual/ });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	const hueTrack = dialog.getByRole('group', { name: 'Matiz', exact: true });
	const hex = dialog.getByRole('textbox', { name: 'Hex' });
	await hex.click();
	await expect(hex).toBeFocused();
	const popoverBox = await bounds(dialog);
	expect(fitsWithin(popoverBox, { x: 0, y: 0, ...viewport })).toBe(true);
	expect(popoverBox.y + popoverBox.height).toBeLessThan((await bounds(trigger)).y);
	await expect(hueTrack).toBeInViewport({ ratio: 1 });
	await hueTrack.click({ trial: true });
});
