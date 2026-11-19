import { expect, test } from './fixtures';
import { bounds, fitsWithin } from './geometry';

test.describe.configure({ mode: 'parallel' });
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

test('a desktop drag across columns keeps the cards inside the grid without overlap', async ({
	mount,
	page,
}) => {
	const story = await mount('portfolio-grid');
	const grid = story.locator('[data-portfolio-grid]');
	await expect(grid).toHaveAttribute('data-grid-ready', 'true');
	const project = grid.locator('[data-portfolio-card="project-one"]');
	await expect(project.locator('[data-portfolio-surface]')).toHaveCSS('cursor', 'grab');
	const original = await bounds(project);
	const gridBox = await bounds(grid);
	const startY = original.y + original.height / 3;
	await page.mouse.move(original.x + original.width / 2, startY);
	await page.mouse.down();
	await page.mouse.move(gridBox.x - 8, startY, { steps: 18 });
	await page.mouse.up();

	await expect(grid).toHaveAttribute('data-grid-animated', 'true');
	const moved = await bounds(project);
	expect(original.x - moved.x).toBeGreaterThan(original.width);
	const cards = await grid.locator('[data-portfolio-card]').all();
	const boxes = await Promise.all(cards.map(bounds));
	const finalGrid = await bounds(grid);
	for (const [index, first] of boxes.entries()) {
		expect(fitsWithin(first, finalGrid)).toBe(true);
		for (const second of boxes.slice(index + 1)) {
			const overlapWidth =
				Math.min(first.x + first.width, second.x + second.width) -
				Math.max(first.x, second.x);
			const overlapHeight =
				Math.min(first.y + first.height, second.y + second.height) -
				Math.max(first.y, second.y);
			expect(overlapWidth <= 1 || overlapHeight <= 1).toBe(true);
		}
	}
});

test('a pointer drag that begins on a card control leaves the card in place', async ({
	mount,
	page,
}) => {
	const story = await mount('portfolio-grid');
	const grid = story.locator('[data-portfolio-grid]');
	await expect(grid).toHaveAttribute('data-grid-ready', 'true');
	const project = grid.locator('[data-portfolio-card="project-one"]');
	await expect(project.locator('[data-portfolio-surface]')).toHaveCSS('cursor', 'grab');
	const original = await bounds(project);
	const control = await bounds(
		project.getByRole('button', { name: 'Embedded Project one control' }),
	);
	const startX = control.x + control.width / 2;
	const startY = control.y + control.height / 2;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX - original.width - 16, startY, { steps: 12 });
	await page.mouse.up();

	await expect(grid).toHaveAttribute('data-grid-animated', 'false');
	expect(await bounds(project)).toEqual(original);
});
