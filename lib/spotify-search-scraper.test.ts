import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
	findExactSpotifyTrackUrlFromSearch,
	findExactSpotifyTrackResult,
	selectFirstValidatedSpotifyTrackUrl,
	type SpotifyBrowser,
	type SpotifyBrowserLauncher,
	type SpotifyBrowserPage,
	type SpotifySearchScrapeResult,
} from '@/lib/spotify-search-scraper';

const searchInput = {
	trackName: 'Cuando Calienta El Sol',
	artistName: 'Luis Miguel',
	albumName: 'Soy Como Quiero Ser',
};

describe('selectFirstValidatedSpotifyTrackUrl', () => {
	it('returns the first Spotify track URL when title and artist are present', () => {
		expect(
			selectFirstValidatedSpotifyTrackUrl(searchInput, {
				bodyText: 'Top result Cuando Calienta El Sol Luis Miguel Songs',
				candidates: [
					{
						href: 'https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5',
						text: 'Cuando Calienta El Sol',
					},
					{
						href: 'https://open.spotify.com/track/not-used',
						text: 'Other Song',
					},
				],
			}),
		).toBe('https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5');
	});

	it('normalizes localized Spotify track URLs', () => {
		expect(
			selectFirstValidatedSpotifyTrackUrl(searchInput, {
				bodyText: 'Top result Cuando Calienta El Sol Luis Miguel Songs',
				candidates: [
					{
						href: 'https://open.spotify.com/intl-es/track/3hVaK0zn3sVWWY8TvN1Te5',
						text: 'Cuando Calienta El Sol',
					},
				],
			}),
		).toBe('https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5');
	});

	it('rejects the first result when the rendered page does not include the artist', () => {
		expect(
			selectFirstValidatedSpotifyTrackUrl(searchInput, {
				bodyText: 'Top result Cuando Calienta El Sol Different Artist Songs',
				candidates: [
					{
						href: 'https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5',
						text: 'Cuando Calienta El Sol',
					},
				],
			}),
		).toBeNull();
	});

	it('rejects the first result when its title does not match', () => {
		expect(
			selectFirstValidatedSpotifyTrackUrl(searchInput, {
				bodyText: 'Top result Si Te Dejas Llevar Luis Miguel Songs',
				candidates: [
					{
						href: 'https://open.spotify.com/track/3cdecPxEdxk99munEMVQ01',
						text: 'Si Te Dejas Llevar',
					},
				],
			}),
		).toBeNull();
	});
});

describe('findExactSpotifyTrackUrlFromSearch', () => {
	it('scrapes the first validated track URL from a rendered Spotify search page', async () => {
		const close = vi.fn(async () => undefined);
		const renderedResult: SpotifySearchScrapeResult = {
			bodyText: 'Top result Cuando Calienta El Sol Luis Miguel Songs',
			candidates: [
				{
					href: 'https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5',
					text: 'Cuando Calienta El Sol',
				},
			],
		};
		const page: SpotifyBrowserPage = {
			goto: async () => undefined,
			waitForSelector: async () => undefined,
			waitForTimeout: async () => undefined,
			evaluate: async <T>() => renderedResult as T,
		};
		const browser: SpotifyBrowser = {
			close,
			newPage: async () => page,
		};
		const browserLauncher: SpotifyBrowserLauncher = {
			launch: vi.fn(async () => browser),
		};

		await expect(
			findExactSpotifyTrackUrlFromSearch(searchInput, { browserLauncher, timeoutMs: 10 }),
		).resolves.toBe('https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5');
		expect(close).toHaveBeenCalledOnce();
	});
});

const exactUrl = 'https://open.spotify.com/track/3hVaK0zn3sVWWY8TvN1Te5';

function createBrowser() {
	const renderedResult: SpotifySearchScrapeResult = {
		bodyText: 'Cuando Calienta El Sol Luis Miguel',
		candidates: [{ href: exactUrl, text: 'Cuando Calienta El Sol' }],
	};
	const page: SpotifyBrowserPage = {
		goto: vi.fn(async () => undefined),
		waitForSelector: vi.fn(async () => undefined),
		waitForTimeout: vi.fn(async () => undefined),
		evaluate: async <T>() => renderedResult as T,
	};
	vi.spyOn(page, 'evaluate');
	const browser: SpotifyBrowser = {
		newPage: vi.fn(async () => page),
		close: vi.fn(async () => undefined),
	};
	const browserLauncher: SpotifyBrowserLauncher = {
		launch: vi.fn(async () => browser),
	};
	return { page, browser, browserLauncher };
}

describe('scraper failure diagnostics', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.doUnmock('@playwright/test');
	});

	it('skips enrichment when artist metadata is absent', async () => {
		const { browserLauncher } = createBrowser();
		const result = await findExactSpotifyTrackResult(
			{ ...searchInput, artistName: null },
			{ browserLauncher },
		);
		expect(result).toEqual({ status: 'skipped', data: null, issues: [] });
		expect(browserLauncher.launch).not.toHaveBeenCalled();
	});

	it('reports unavailable browser dependencies', async () => {
		vi.doMock('@playwright/test', () => {
			throw new Error('module unavailable');
		});
		const result = await findExactSpotifyTrackResult(searchInput);
		expect(result.issues[0]).toMatchObject({
			operation: 'dependency',
			code: 'browser-unavailable',
		});
	});

	it('reports launch failures without passing raw browser errors through', async () => {
		const { browserLauncher } = createBrowser();
		vi.mocked(browserLauncher.launch).mockRejectedValue(new Error('sensitive launch detail'));
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.issues[0].code).toBe('browser-launch-failed');
		expect(JSON.stringify(result)).not.toContain('sensitive launch detail');
		expect(browserLauncher.launch).toHaveBeenCalledWith({ headless: true, timeout: 8000 });
	});

	it.each(['goto', 'evaluate'] as const)(
		'closes the browser after a failed %s',
		async (operation) => {
			const { browserLauncher, browser, page } = createBrowser();
			vi.mocked(page[operation]).mockRejectedValue(new Error('scrape failed'));
			const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
			expect(result.status).toBe('failed');
			expect(result.issues[0].code).toBe(
				operation === 'goto' ? 'browser-navigation-failed' : 'browser-extraction-failed',
			);
			expect(browser.close).toHaveBeenCalledOnce();
		},
	);

	it('treats selector timeouts as a failed scrape, not a valid no-match result', async () => {
		const { browserLauncher, page } = createBrowser();
		const error = new Error('timeout');
		error.name = 'TimeoutError';
		vi.mocked(page.waitForSelector).mockRejectedValue(error);
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.status).toBe('failed');
		expect(result.issues[0].code).toBe('timeout');
	});

	it('keeps a validated link when closing the browser fails', async () => {
		const { browserLauncher, browser } = createBrowser();
		vi.mocked(browser.close).mockRejectedValue(new Error('cleanup failed'));
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.status).toBe('success');
		expect(result.data).toBe(exactUrl);
		expect(result.issues[0].code).toBe('browser-cleanup-failed');
	});

	it('reports both the extraction and cleanup failure', async () => {
		const { browserLauncher, browser, page } = createBrowser();
		vi.mocked(page.evaluate).mockRejectedValue(new Error('extraction failed'));
		vi.mocked(browser.close).mockRejectedValue(new Error('cleanup failed'));
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.issues.map(({ code }) => code)).toEqual([
			'browser-extraction-failed',
			'browser-cleanup-failed',
		]);
	});

	it('bounds cleanup time and still returns a successful result', async () => {
		vi.useFakeTimers();
		const { browserLauncher, browser } = createBrowser();
		vi.mocked(browser.close).mockImplementation(() => new Promise(() => {}));
		const pending = findExactSpotifyTrackResult(searchInput, { browserLauncher });
		await vi.advanceTimersByTimeAsync(2000);
		const result = await pending;
		expect(result.data).toBe(exactUrl);
		expect(result.issues[0].code).toBe('browser-cleanup-failed');
	});

	it('bounds extraction time and attempts cleanup', async () => {
		vi.useFakeTimers();
		const { browserLauncher, browser, page } = createBrowser();
		vi.mocked(page.evaluate).mockImplementation(() => new Promise(() => {}));
		const pending = findExactSpotifyTrackResult(searchInput, {
			browserLauncher,
			timeoutMs: 10,
		});
		await vi.advanceTimersByTimeAsync(10);
		const result = await pending;
		expect(result.issues[0].code).toBe('timeout');
		expect(browser.close).toHaveBeenCalledOnce();
	});

	it('distinguishes a valid title mismatch from scraper failure', async () => {
		const { browserLauncher, page } = createBrowser();
		vi.mocked(page.evaluate).mockResolvedValue({ bodyText: 'Luis Miguel', candidates: [] });
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result).toEqual({ status: 'empty', data: null, issues: [] });
	});
});

describe('scraper HTTP and page failures', () => {
	it('reports HTTP rejection and cleans up without attempting extraction', async () => {
		const { browserLauncher, browser, page } = createBrowser();
		vi.mocked(page.goto).mockResolvedValue({ status: () => 403 });
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.issues[0]).toMatchObject({ code: 'http-error', httpStatus: 403 });
		expect(page.evaluate).not.toHaveBeenCalled();
		expect(browser.close).toHaveBeenCalledOnce();
	});

	it('reports page creation failures and closes the launched browser', async () => {
		const { browserLauncher, browser } = createBrowser();
		vi.mocked(browser.newPage).mockRejectedValue(new Error('page failed'));
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.issues[0].code).toBe('browser-page-failed');
		expect(browser.close).toHaveBeenCalledOnce();
	});

	it('reports malformed extracted data rather than a legitimate no-match outcome', async () => {
		const { browserLauncher, page } = createBrowser();
		vi.mocked(page.evaluate).mockResolvedValue({ candidates: null });
		const result = await findExactSpotifyTrackResult(searchInput, { browserLauncher });
		expect(result.status).toBe('failed');
		expect(result.issues[0].code).toBe('invalid-response');
	});
});
