import { expect, test } from './fixtures';
import { bounds, fitsWithin } from './geometry';

test.describe.configure({ mode: 'parallel' });

test('hovering a visible skill pauses and leaving it resumes the desktop marquee', async ({
	mount,
	page,
}) => {
	const story = await mount('experience-overview');
	const viewport = story.locator('[data-tech-marquee-viewport]');
	const track = story.locator('[data-tech-marquee-track]');
	await expect(track).not.toHaveCSS('animation-name', 'none');
	await expect(track).toHaveCSS('animation-play-state', 'running');
	const point = await viewport.evaluate((element) => {
		const clip = element.getBoundingClientRect();
		for (const skill of element.querySelectorAll('[data-tech-marquee-item]')) {
			const item = skill.getBoundingClientRect();
			const x = item.left + item.width / 2;
			if (x > clip.left + 15 && x < clip.right - 15) {
				return { x, y: item.top + item.height / 2 };
			}
		}
		throw new Error('No skill is visible in the marquee.');
	});
	await page.mouse.move(point.x, point.y);
	await expect(track).toHaveCSS('animation-play-state', 'paused');
	await page.mouse.move(0, 0);
	await expect(track).toHaveCSS('animation-play-state', 'running');
});

test('keyboard focus stops the marquee and scrolls the clipped skill links into view', async ({
	mount,
	page,
	tabKey,
}) => {
	const story = await mount('experience-overview');
	const viewport = story.locator('[data-tech-marquee-viewport]');
	const track = viewport.locator('[data-tech-marquee-track]');
	await expect(track).not.toHaveCSS('animation-name', 'none');
	await page.keyboard.press(tabKey);
	await expect(viewport.getByRole('link', { name: 'Explore React', exact: true })).toBeFocused();
	await expect(track).toHaveCSS('animation-name', 'none');
	await expect(viewport).toHaveCSS('overflow-x', 'auto');
	const clippedSkill = viewport.getByRole('link', { name: 'Explore Docker', exact: true });
	expect(fitsWithin(await bounds(clippedSkill), await bounds(viewport))).toBe(false);
	for (const name of ['TypeScript', 'Next.js', 'Tailwind CSS', 'PostgreSQL', 'Docker']) {
		await page.keyboard.press(tabKey);
		const link = viewport.getByRole('link', { name: `Explore ${name}`, exact: true });
		await expect(link).toBeFocused();
	}
	await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
	await expect
		.poll(async () => fitsWithin(await bounds(clippedSkill), await bounds(viewport)))
		.toBe(true);
});
