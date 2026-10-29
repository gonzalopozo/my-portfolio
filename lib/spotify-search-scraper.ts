import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import {
	buildSpotifyTrackSearchUrl,
	validateSpotifyTrackUrl,
	type SpotifyTrackSearchInput,
} from '@/lib/spotify-utils';
import { reportMusicIssues } from '@/lib/music-diagnostics';
import type { MusicIssue, MusicIssueCode, MusicResult } from '@/lib/music-status';
import { spotifySearchResultSchema } from '@/lib/schemas/music';

const SPOTIFY_SEARCH_SCRAPE_TIMEOUT_MS = 8_000;
const SPOTIFY_BROWSER_CLEANUP_TIMEOUT_MS = 2_000;

interface SpotifySearchScrapeCandidate {
	href: string;
	text: string;
}

export interface SpotifySearchScrapeResult {
	bodyText: string;
	candidates: SpotifySearchScrapeCandidate[];
}

export interface SpotifyBrowserPage {
	goto: (
		url: string,
		options?: { waitUntil?: 'domcontentloaded'; timeout?: number },
	) => Promise<unknown>;
	waitForSelector: (selector: string, options?: { timeout?: number }) => Promise<unknown>;
	waitForTimeout: (timeout: number) => Promise<unknown>;
	evaluate: <T>(callback: () => T) => Promise<T>;
}

export interface SpotifyBrowser {
	newPage: (options?: { userAgent?: string }) => Promise<SpotifyBrowserPage>;
	close: () => Promise<unknown>;
}

export interface SpotifyBrowserLauncher {
	launch: (options?: { headless?: boolean; timeout?: number }) => Promise<SpotifyBrowser>;
}

interface SpotifySearchScraperOptions {
	browserLauncher?: SpotifyBrowserLauncher;
	timeoutMs?: number;
}

/** Keep nullable callers safe while giving standalone failures a server log. */
export async function findExactSpotifyTrackUrlFromSearch(
	input: SpotifyTrackSearchInput,
	options: SpotifySearchScraperOptions = {},
): Promise<string | null> {
	const result = await findExactSpotifyTrackResult(input, options);
	if (result.issues.length) reportMusicIssues(result.issues);
	return result.data;
}

export async function findExactSpotifyTrackResult(
	input: SpotifyTrackSearchInput,
	options: SpotifySearchScraperOptions = {},
): Promise<MusicResult<string>> {
	const searchUrl = buildSpotifyTrackSearchUrl(input);
	if (!searchUrl) return { status: 'skipped', data: null, issues: [] };

	const timeoutMs =
		typeof options.timeoutMs === 'number' &&
		Number.isFinite(options.timeoutMs) &&
		options.timeoutMs > 0
			? Math.min(options.timeoutMs, SPOTIFY_SEARCH_SCRAPE_TIMEOUT_MS)
			: SPOTIFY_SEARCH_SCRAPE_TIMEOUT_MS;
	let browser: SpotifyBrowser | null = null;
	let operation: MusicIssue['operation'] = 'dependency';
	let result: MusicResult<string> = { status: 'empty', data: null, issues: [] };

	try {
		const browserLauncher = options.browserLauncher ?? (await loadChromiumBrowserLauncher());
		if (!browserLauncher) {
			return failedScrape('dependency', 'browser-unavailable');
		}

		operation = 'launch';
		// Playwright's launch timeout terminates its process; a race alone would leak it.
		browser = await browserLauncher.launch({ headless: true, timeout: timeoutMs });
		operation = 'page';
		const page = await withDeadline(
			browser.newPage({
				userAgent:
					'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
			}),
			timeoutMs,
		);

		operation = 'navigation';
		const navigation = await page.goto(searchUrl, {
			waitUntil: 'domcontentloaded',
			timeout: timeoutMs,
		});
		if (
			navigation &&
			typeof navigation === 'object' &&
			'status' in navigation &&
			typeof navigation.status === 'function'
		) {
			const httpStatus: unknown = navigation.status();
			if (
				typeof httpStatus === 'number' &&
				Number.isInteger(httpStatus) &&
				httpStatus >= 400 &&
				httpStatus <= 599
			) {
				result = failedScrape('navigation', 'http-error');
				result.issues[0].httpStatus = httpStatus;
				return result;
			}
		}
		operation = 'extraction';
		// A selector deadline is a failed scrape, not proof that Spotify has no match.
		await page.waitForSelector('a[href*="/track/"]', { timeout: timeoutMs });
		await withDeadline(page.waitForTimeout(250), timeoutMs);

		const renderedResult = await withDeadline(
			page.evaluate<SpotifySearchScrapeResult>(() => ({
				bodyText: document.body.innerText.slice(0, 100_000),
				candidates: [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/track/"]')]
					.slice(0, 100)
					.map((anchor) => ({
						href: anchor.href,
						text: anchor.textContent?.trim().replace(/\s+/g, ' ') ?? '',
					})),
			})),
			timeoutMs,
		);
		const parsed = spotifySearchResultSchema.safeParse(renderedResult);
		if (!parsed.success) {
			result = failedScrape('validation', 'invalid-response');
		} else {
			const trackUrl = selectFirstValidatedSpotifyTrackUrl(input, parsed.data);
			result = trackUrl
				? { status: 'success', data: trackUrl, issues: [] }
				: { status: 'empty', data: null, issues: [] };
		}
	} catch (error) {
		unstable_rethrow(error);
		result = failedScrape(operation, scrapeFailureCode(operation, error));
	} finally {
		if (browser) {
			try {
				await withDeadline(browser.close(), SPOTIFY_BROWSER_CLEANUP_TIMEOUT_MS);
			} catch {
				// Preserve both the original result and any earlier failure.
				result.issues.push({
					integration: 'spotify-search',
					operation: 'cleanup',
					code: 'browser-cleanup-failed',
				});
			}
		}
	}

	return result;
}

export function selectFirstValidatedSpotifyTrackUrl(
	input: SpotifyTrackSearchInput,
	result: SpotifySearchScrapeResult,
): string | null {
	const parsed = spotifySearchResultSchema.safeParse(result);
	if (!parsed.success) return null;
	const expectedTrack = normalizeTrackTitle(input?.trackName);
	const expectedArtist = normalizeName(input?.artistName);
	const bodyText = normalizeName(parsed.data.bodyText);

	if (!expectedTrack || !expectedArtist || !bodyText.includes(expectedArtist)) return null;

	const firstCandidate = parsed.data.candidates.find((candidate) =>
		validateSpotifyTrackUrl(candidate.href),
	);
	if (!firstCandidate || normalizeTrackTitle(firstCandidate.text) !== expectedTrack) return null;

	return validateSpotifyTrackUrl(firstCandidate.href);
}

async function loadChromiumBrowserLauncher(): Promise<SpotifyBrowserLauncher | null> {
	// Managed Vercel builds do not install Playwright browsers. Use the existing fallback.
	if (process.env.VERCEL) return null;
	const { chromium } = await import('@playwright/test');
	return chromium ?? null;
}

function failedScrape(
	operation: MusicIssue['operation'],
	code: MusicIssueCode,
): MusicResult<string> {
	return {
		status: 'failed',
		data: null,
		issues: [{ integration: 'spotify-search', operation, code }],
	};
}

function scrapeFailureCode(operation: MusicIssue['operation'], error: unknown): MusicIssueCode {
	if (operation === 'dependency') return 'browser-unavailable';
	if (operation === 'launch') return 'browser-launch-failed';
	if (error instanceof Error && error.name === 'TimeoutError') return 'timeout';
	if (operation === 'page') return 'browser-page-failed';
	if (operation === 'navigation') return 'browser-navigation-failed';
	return 'browser-extraction-failed';
}

/** Closing the browser cancels work that outlives a page-operation deadline. */
async function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => {
					const error = new Error('Music operation deadline exceeded.');
					error.name = 'TimeoutError';
					reject(error);
				}, timeoutMs);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
}

function normalizeTrackTitle(value: unknown): string {
	return normalizeName(stripVersionDetails(value));
}

function stripVersionDetails(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	return value
		.replace(
			/\s*[-–—]\s*(\d{4}\s*)?(remaster(ed)?|radio edit|single version|album version|mono|stereo|clean|explicit).*$/i,
			'',
		)
		.replace(
			/\s*\((\d{4}\s*)?(remaster(ed)?|radio edit|single version|album version|mono|stereo|clean|explicit)[^)]+\)\s*$/i,
			'',
		)
		.trim();
}

function normalizeName(value: unknown): string {
	if (typeof value !== 'string') return '';
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}
