import { longSkillName, track } from '../gallery/fixture-data';
import { expect, test } from './fixtures';
import { bounds, fitsWithin } from './geometry';

test.describe.configure({ mode: 'parallel' });

test('the info card scrolls a long status with the keyboard and keeps both actions reachable', async ({
	mount,
	page,
	tabKey,
}) => {
	const story = await mount('info-card');
	const card = story.locator('[data-slot="card"]');
	const cv = card.getByRole('link', { name: 'Download CV' });
	const status = card.getByRole('status');
	const aboutMe = card.getByRole('button', { name: 'About Me' });
	await expect(cv).toBeVisible();
	await page.keyboard.press(tabKey);
	await expect(cv).toBeFocused();
	await page.keyboard.press(tabKey);
	await expect(status).toBeFocused();
	expect(await status.evaluate((element) => element.scrollHeight)).toBeGreaterThan(
		await status.evaluate((element) => element.clientHeight),
	);
	await page.keyboard.press('ArrowDown');
	await expect.poll(() => status.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
	await page.keyboard.press(tabKey);
	await expect(aboutMe).toBeFocused();
	expect(fitsWithin(await bounds(aboutMe), await bounds(card))).toBe(true);
});

test('the mobile social link receives pointer hits near the edge of the tile', async ({
	mount,
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 700 });
	const story = await mount('social-link');
	const card = await bounds(story.locator('[data-slot="card"]'));
	const link = story.getByRole('link', { name: 'Open gallery social profile' });
	const hitLink = await link.evaluate(
		(element, { x, y }) => element.contains(document.elementFromPoint(x, y)),
		{ x: card.x + card.width - 7, y: card.y + card.height / 2 },
	);
	expect(hitLink).toBe(true);
});

test('the desktop social link has a compact target and draws a keyboard focus ring', async ({
	mount,
	page,
	tabKey,
}) => {
	const story = await mount('social-link');
	const card = await bounds(story.locator('[data-slot="card"]'));
	const link = story.getByRole('link', { name: 'Open gallery social profile' });
	const linkBox = await bounds(link);
	expect(linkBox.width).toBeLessThan(card.width / 2);
	expect(fitsWithin(linkBox, card)).toBe(true);
	const idleShadow = await link.evaluate((element) => getComputedStyle(element).boxShadow);
	await page.keyboard.press(tabKey);
	await expect(link).toBeFocused();
	await expect(link).not.toHaveCSS('box-shadow', idleShadow);
});

test('the mobile track opens one link across the artwork and card edges', async ({
	mount,
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 700 });
	const story = await mount('music-mobile');
	const card = await bounds(story.locator('[data-slot="card"]'));
	const link = story.getByRole('link', { name: /^Now playing: .*Opens Spotify\.$/ });
	await expect(story.getByRole('link')).toHaveCount(1);
	await expect(link).toHaveAttribute('href', track.spotifyUrl);
	await expect
		.poll(() =>
			story.locator('img').evaluate((image) => {
				return (
					image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
				);
			}),
		)
		.toBe(true);
	const edge = { x: card.x + card.width - 6, y: card.y + card.height / 2 };
	expect(
		await link.evaluate(
			(element, { x, y }) => element.contains(document.elementFromPoint(x, y)),
			edge,
		),
	).toBe(true);
});

test('the desktop track keeps its separate keyboard links clear of the activity badge', async ({
	mount,
	page,
	tabKey,
}) => {
	const story = await mount('music-desktop');
	const source = story.getByRole('link').filter({ hasText: 'spotify' });
	const title = story.getByRole('link').filter({ hasText: track.trackName });
	const artist = story.getByRole('link').filter({ hasText: 'Gallery artist' });
	for (const link of [source, title, artist]) {
		await page.keyboard.press(tabKey);
		await expect(link).toBeFocused();
	}
	const badge = await bounds(story.getByText('Now Playing', { exact: true }).locator('..'));
	const titleBox = await bounds(title);
	const card = await bounds(story.locator('[data-slot="card"]'));
	expect(titleBox.y).toBeGreaterThan(badge.y + badge.height);
	expect(fitsWithin(await bounds(artist), card)).toBe(true);
});

test('hover reveals the hobby preview and its action inside the tile', async ({ mount, page }) => {
	const story = await mount('hobbies');
	const preview = story.getByRole('button', { name: 'Preview NBA' });
	const tile = preview.locator('..');
	const caption = tile.getByText('NBA', { exact: true });
	const action = tile.getByRole('button', { name: 'Show About me section from NBA' });
	await expect(caption).toHaveCSS('opacity', '0');
	await preview.hover();
	await expect(preview).toHaveAttribute('aria-pressed', 'true');
	await expect(caption).toHaveCSS('opacity', '1');
	await expect(action).toHaveCSS('opacity', '1');
	expect(fitsWithin(await bounds(action), await bounds(tile))).toBe(true);
	await page.mouse.move(0, 0);
	await expect(caption).toHaveCSS('opacity', '0');
});

test('the hobby preview stays revealed when focus moves to its action', async ({
	mount,
	page,
	tabKey,
}) => {
	const story = await mount('hobbies');
	const preview = story.getByRole('button', { name: 'Preview NBA' });
	const action = story.getByRole('button', { name: 'Show About me section from NBA' });
	await page.keyboard.press(tabKey);
	await expect(preview).toBeFocused();
	await expect(preview).toHaveAttribute('aria-pressed', 'true');
	await page.keyboard.press(tabKey);
	await expect(action).toBeFocused();
	await expect(action).toHaveCSS('opacity', '1');
	await expect(preview).toHaveAttribute('aria-pressed', 'true');
	expect(fitsWithin(await bounds(action), await bounds(preview.locator('..')))).toBe(true);
});

test('the mobile skill pills wrap a long skill name within a narrow card', async ({
	mount,
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 700 });
	const story = await mount('skills-pills');
	const card = story.locator('[data-slot="card"]');
	const shortSkill = story.getByText('React', { exact: true });
	const longSkill = story.getByText(longSkillName, { exact: true });
	const shortBox = await bounds(shortSkill);
	const longBox = await bounds(longSkill);
	expect(longBox.y).toBeGreaterThanOrEqual(shortBox.y + shortBox.height);
	expect(fitsWithin(longBox, await bounds(card))).toBe(true);
	const textLines = await longSkill.evaluate((element) => {
		const range = document.createRange();
		range.selectNodeContents(element);
		return new Set(Array.from(range.getClientRects(), (rect) => Math.round(rect.top))).size;
	});
	expect(textLines).toBeGreaterThan(1);
	expect(
		await card.evaluate((element) => element.scrollWidth - element.clientWidth),
	).toBeLessThanOrEqual(1);
});
