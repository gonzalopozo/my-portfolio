import { expect, test } from './fixtures';

test.describe('server-rendered portfolio', () => {
	test.use({ javaScriptEnabled: false });

	for (const width of [390, 820, 1440]) {
		test(`shows readable cards before hydration at ${width}px`, async ({ page }) => {
			await page.setViewportSize({ width, height: 844 });
			await page.goto('/');
			const grid = page.locator('[data-portfolio-grid]');
			await expect(grid).toHaveAttribute('data-grid-ready', 'false');
			const info = grid.locator('[data-portfolio-card="info"]');
			await expect(info.getByRole('heading', { name: "Hey, I'm Gonzalo." })).toBeVisible();
			await expect(grid.locator('[data-location-map]')).toHaveAttribute(
				'data-map-state',
				'preview',
			);
			const boxes = await grid.locator('[data-portfolio-card]:visible').evaluateAll((cards) =>
				cards.map((card) => {
					const { x, y, width, height } = card.getBoundingClientRect();
					return { x, y, width, height };
				}),
			);
			expect(boxes.length).toBeGreaterThan(5);
			for (const [index, box] of boxes.entries()) {
				expect(box.width).toBeGreaterThan(0);
				expect(box.height).toBeGreaterThan(0);
				expect(box.x).toBeGreaterThanOrEqual(0);
				expect(box.x + box.width).toBeLessThanOrEqual(width);
				for (const other of boxes.slice(index + 1)) {
					expect(
						box.x < other.x + other.width &&
							other.x < box.x + box.width &&
							box.y < other.y + other.height &&
							other.y < box.y + box.height,
					).toBe(false);
				}
			}
		});
	}
});

test.describe('public responsive layout', () => {
	for (const colorScheme of ['light', 'dark'] as const) {
		for (const width of [320, 390, 430, 767, 768, 1024, 1440]) {
			test(`reflows at ${width}px in ${colorScheme} mode`, async ({ page }) => {
				await page.setViewportSize({ width, height: 844 });
				await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
				await page.goto('/');
				await expect(page.locator('[data-portfolio-grid]')).toHaveAttribute(
					'data-layout',
					width < 768 ? 'mobile' : 'bento',
				);
				await expect(page.getByRole('main')).toHaveCount(1);
				await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
				await expect
					.poll(() => page.evaluate(() => document.documentElement.scrollWidth))
					.toBeLessThanOrEqual(width);
				const navigation = page.getByRole('navigation', { name: 'Portfolio sections' });
				await expect(navigation).toHaveCSS('position', width < 768 ? 'fixed' : 'static');
				if (width < 768) {
					for (const button of await navigation.getByRole('button').all()) {
						const box = await button.boundingBox();
						expect(box?.width).toBeGreaterThanOrEqual(44);
						expect(box?.height).toBeGreaterThanOrEqual(44);
					}
					await expect(page.getByRole('button', { name: /Preview/ })).toHaveCount(0);
					await expect(page.getByText('Beyond the code')).toHaveCount(0);
					await expect(
						page.getByRole('region', { name: 'Hobbies' }).getByRole('button'),
					).toHaveCount(6);
				}
			});
		}
	}
});

test.describe('mobile section navigation', () => {
	test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: 'reduce' });
	});

	test('filters sections and restores them through Back and Forward at page top', async ({
		page,
	}) => {
		await page.goto('/');
		const grid = page.locator('[data-portfolio-grid]');
		await expect(grid).toHaveAttribute('data-layout', 'mobile');
		const homeIds = await grid
			.locator('[data-portfolio-card]')
			.evaluateAll((cards) => cards.map((card) => card.getAttribute('data-portfolio-card')));
		const navigation = page.getByRole('navigation', { name: 'Portfolio sections' });
		await navigation.getByRole('button', { name: 'Show Projects section' }).tap();
		await expect(page).toHaveURL(/section=Projects/);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
		await expect(
			grid.locator('[data-portfolio-card]:not([data-category="project"])'),
		).toHaveCount(0);
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await navigation.getByRole('button', { name: 'Show Experience section' }).tap();
		await expect(page).toHaveURL(/section=Experience/);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
		await expect(
			grid.locator('[data-portfolio-card]:not([data-category="experience"])'),
		).toHaveCount(0);
		await page.goBack();
		await expect(page).toHaveURL(/section=Projects/);
		await expect(
			grid.locator('[data-portfolio-card]:not([data-category="project"])'),
		).toHaveCount(0);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await page.goForward();
		await expect(page).toHaveURL(/section=Experience/);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
		await expect(
			grid.locator('[data-portfolio-card]:not([data-category="experience"])'),
		).toHaveCount(0);
		await navigation.getByRole('button', { name: 'Show All section' }).tap();
		await expect(page).toHaveURL(
			new URL('/', process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').href,
		);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
		await expect
			.poll(() =>
				grid
					.locator('[data-portfolio-card]')
					.evaluateAll((cards) =>
						cards.map((card) => card.getAttribute('data-portfolio-card')),
					),
			)
			.toEqual(homeIds);
	});

	test('opens a direct section URL without home cards and adapts across the mobile boundary', async ({
		page,
	}) => {
		await page.goto('/?section=Projects');
		const grid = page.locator('[data-portfolio-grid]');
		await expect(grid).toHaveAttribute('data-layout', 'mobile');
		await expect(grid.locator('[data-portfolio-card="info"]')).toHaveCount(0);
		await page.setViewportSize({ width: 768, height: 844 });
		await expect(grid).toHaveAttribute('data-layout', 'bento');
		await expect(grid.locator('[data-portfolio-card="info"]')).toBeVisible();
		await page.setViewportSize({ width: 767, height: 844 });
		await expect(grid).toHaveAttribute('data-layout', 'mobile');
		await expect(grid.locator('[data-portfolio-card="info"]')).toHaveCount(0);
	});

	test('opens the map story by keyboard and returns focus after closing it', async ({ page }) => {
		await page.goto('/?section=About+me');
		await expect(page.locator('[data-portfolio-grid]')).toHaveAttribute(
			'data-layout',
			'mobile',
		);
		const marker = page.getByRole('button', { name: 'Map marker', exact: true });
		await marker.focus();
		await marker.press('Enter');
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await expect(
			dialog.getByRole('heading', { name: 'Arroyomolinos, Madrid', level: 3 }),
		).toHaveCSS('font-size', '20px');
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
		await expect(marker).toBeFocused();
	});

	test('keeps the map story usable when external map resources fail', async ({ page }) => {
		await page.route('**/*cartocdn.com/**', (route) => route.abort());
		await page.goto('/?section=About+me');
		const marker = page.getByRole('button', { name: 'Map marker', exact: true });
		await marker.scrollIntoViewIfNeeded();
		await expect(page.locator('[data-location-map]')).toHaveAttribute(
			'data-map-state',
			'fallback',
		);
		await marker.focus();
		await marker.press('Enter');
		await expect(page.getByRole('dialog')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toBeHidden();
		await expect(marker).toBeFocused();
	});

	test('leaves the final home card clear of the fixed navigation', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('[data-portfolio-grid]')).toHaveAttribute(
			'data-layout',
			'mobile',
		);
		await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
		await expect
			.poll(() =>
				page.evaluate(() => {
					const lastCard = document.querySelector('[data-portfolio-card="hobbies"]');
					const navigation = document.querySelector(
						'nav[aria-label="Portfolio sections"]',
					);
					if (!lastCard || !navigation) return false;
					return (
						lastCard.getBoundingClientRect().bottom <=
						navigation.getBoundingClientRect().top
					);
				}),
			)
			.toBe(true);
	});
});
