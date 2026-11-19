import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { bounds } from './geometry';

test.describe.configure({ mode: 'parallel' });

async function dragCharlieAboveAlpha(page: Page, table: Locator) {
	const start = await bounds(table.getByRole('button', { name: 'Move Charlie' }));
	const first = await bounds(table.getByRole('row').filter({ hasText: 'Alpha' }));
	const startX = start.x + start.width / 2;
	const startY = start.y + start.height / 2;
	const targetY = first.y + first.height / 2 - 4;
	const draggedRow = page.locator('tr[data-dnd-dragging]');
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX, startY - 12, { steps: 3 });
	await expect(draggedRow).toBeVisible();
	await page.mouse.move(startX, targetY, { steps: 12 });
	await expect
		.poll(async () => {
			const dragged = await bounds(draggedRow);
			return dragged.y + dragged.height / 2;
		})
		.toBeLessThan(first.y + first.height / 2);
	return draggedRow;
}

test('dragging a row by its handle changes the visible order', async ({ mount, page }) => {
	const story = await mount('sortable-table');
	const table = story.getByRole('table', { name: 'Sortable gallery rows' });
	const labels = table.getByRole('cell', { name: /^(Alpha|Bravo|Charlie)$/ });
	await expect(labels).toHaveText(['Alpha', 'Bravo', 'Charlie']);

	await dragCharlieAboveAlpha(page, table);
	await page.mouse.up();
	await expect(labels).toHaveText(['Charlie', 'Alpha', 'Bravo']);
	await expect(story.getByText('Charlie moved to position 1')).toBeVisible();
});

test('Escape cancels an active pointer drag and keeps the original rows', async ({
	mount,
	page,
}) => {
	const story = await mount('sortable-table');
	const table = story.getByRole('table', { name: 'Sortable gallery rows' });
	const draggedRow = await dragCharlieAboveAlpha(page, table);
	await page.keyboard.press('Escape');
	await page.mouse.up();
	await expect(draggedRow).toHaveCount(0);
	await expect(table.getByRole('cell', { name: /^(Alpha|Bravo|Charlie)$/ })).toHaveText([
		'Alpha',
		'Bravo',
		'Charlie',
	]);
	await expect(story.getByRole('status')).toBeEmpty();
});
