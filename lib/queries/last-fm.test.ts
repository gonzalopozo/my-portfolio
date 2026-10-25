import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock('@/lib/spotify-oembed', () => ({
	getSpotifyOEmbedResult: vi.fn(),
}));
vi.mock('@/lib/spotify-search-scraper', () => ({
	findExactSpotifyTrackResult: vi.fn(),
}));

import { getTrack, getMusicSnapshot } from '@/lib/queries/last-fm';
import { getSpotifyOEmbedResult } from '@/lib/spotify-oembed';
import { findExactSpotifyTrackResult } from '@/lib/spotify-search-scraper';

interface LastFmTrackJSON {
	'@attr'?: { nowplaying?: string };
	name: string;
	artist?: { '#text'?: string };
	album?: { '#text'?: string };
	url?: string;
	date?: { uts?: string; '#text'?: string };
}

const LASTFM_TRACK_URL = 'https://www.last.fm/music/The+Beatles/_/Come+Together';
const SPOTIFY_TRACK_URL = 'https://open.spotify.com/track/3qovVqQWqHRZ8B';
const SPOTIFY_THUMBNAIL_URL =
	'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e020e61ccc192d563f763decbb8';
const SPOTIFY_SEARCH_FALLBACK_URL =
	'https://open.spotify.com/search/Come%20Together%20The%20Beatles%20Abbey%20Road';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

function buildTrack(overrides: Partial<LastFmTrackJSON> = {}): LastFmTrackJSON {
	return {
		name: 'Come Together',
		artist: { '#text': 'The Beatles' },
		album: { '#text': 'Abbey Road' },
		url: LASTFM_TRACK_URL,
		...overrides,
	};
}

function stubLastFmResponse(track: LastFmTrackJSON | LastFmTrackJSON[], status = 200): Mock {
	const tracks = Array.isArray(track) ? track : [track];
	const fetchMock = vi.fn(async () => jsonResponse({ recenttracks: { track: tracks } }, status));
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

describe('getTrack', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		vi.stubEnv('LASTFM_USERNAME', 'demo');
		vi.stubEnv('LASTFM_API_KEY', 'secret');
		vi.mocked(getSpotifyOEmbedResult).mockResolvedValue({
			status: 'skipped',
			data: null,
			issues: [],
		});
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'empty',
			data: null,
			issues: [],
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.clearAllMocks();
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it('returns null when the Last.fm API responds with an error status', async () => {
		stubLastFmResponse(buildTrack(), 500);

		await expect(getTrack()).resolves.toBeNull();
		expect(findExactSpotifyTrackResult).not.toHaveBeenCalled();
		expect(getSpotifyOEmbedResult).not.toHaveBeenCalled();
	});

	it('returns null when there are no recent tracks in the response', async () => {
		stubLastFmResponse(buildTrack());
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ recenttracks: {} })),
		);

		await expect(getTrack()).resolves.toBeNull();
	});

	it('returns null when the recent tracks list is empty', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ recenttracks: { track: [] } })),
		);

		await expect(getTrack()).resolves.toBeNull();
	});

	it('maps a now-playing track to a Track with isOnline true', async () => {
		stubLastFmResponse(buildTrack({ '@attr': { nowplaying: 'true' } }));

		const result = await getTrack();

		expect(result).toEqual({
			isOnline: true,
			trackName: 'Come Together',
			artistName: 'The Beatles',
			albumName: 'Abbey Road',
			artworkUrl: null,
			lastFmUrl: LASTFM_TRACK_URL,
			spotifyTrackId: null,
			spotifyUrl: SPOTIFY_SEARCH_FALLBACK_URL,
			spotifyArtworkUrl: null,
			playedAtUnix: null,
			playedAtLabel: null,
		});
	});

	it('maps a recently played track with its playedAt timestamp', async () => {
		stubLastFmResponse(
			buildTrack({ date: { uts: '1700000000', '#text': '15 Nov 2023, 12:00' } }),
		);

		const result = await getTrack();

		expect(result?.isOnline).toBe(false);
		expect(result?.playedAtUnix).toBe(1700000000);
		expect(result?.playedAtLabel).toBe('15 Nov 2023, 12:00');
	});

	it('uses Spotify oEmbed artwork when the scraper finds an exact track URL', async () => {
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'success',
			data: SPOTIFY_TRACK_URL,
			issues: [],
		});
		vi.mocked(getSpotifyOEmbedResult).mockResolvedValue({
			status: 'success',
			data: SPOTIFY_THUMBNAIL_URL,
			issues: [],
		});
		stubLastFmResponse(buildTrack());

		const result = await getTrack();

		expect(result?.artworkUrl).toBe(SPOTIFY_THUMBNAIL_URL);
		expect(result?.spotifyArtworkUrl).toBe(SPOTIFY_THUMBNAIL_URL);
		expect(result?.spotifyUrl).toBe(SPOTIFY_TRACK_URL);
		expect(result?.spotifyTrackId).toBeNull();
		expect(getSpotifyOEmbedResult).toHaveBeenCalledWith(SPOTIFY_TRACK_URL);
	});

	it('falls back to a Spotify search URL when no exact match is found', async () => {
		stubLastFmResponse(buildTrack());

		const result = await getTrack();

		expect(result?.spotifyUrl).toBe(SPOTIFY_SEARCH_FALLBACK_URL);
		expect(result?.artworkUrl).toBeNull();
		expect(result?.spotifyArtworkUrl).toBeNull();
		expect(findExactSpotifyTrackResult).toHaveBeenCalledOnce();
		expect(getSpotifyOEmbedResult).not.toHaveBeenCalled();
	});

	it('handles missing artist and album fields gracefully', async () => {
		stubLastFmResponse(buildTrack({ artist: undefined, album: undefined }));

		const result = await getTrack();

		expect(result?.artistName).toBeNull();
		expect(result?.albumName).toBeNull();
	});

	it('ignores a non-numeric playedAt uts value', async () => {
		stubLastFmResponse(buildTrack({ date: { uts: 'not-a-number', '#text': 'label' } }));

		const result = await getTrack();

		expect(result?.playedAtUnix).toBeNull();
		expect(result?.playedAtLabel).toBe('label');
	});

	it('builds the request URL with the configured Last.fm credentials', async () => {
		const fetchMock = stubLastFmResponse(buildTrack());

		await getTrack();

		expect(fetchMock).toHaveBeenCalledOnce();
		const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(requestUrl).toBe(
			'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=demo&api_key=secret&format=json&limit=1',
		);
	});

	it('enriches the track using the Spotify helpers', async () => {
		stubLastFmResponse(buildTrack());

		await getTrack();

		expect(findExactSpotifyTrackResult).toHaveBeenCalledWith({
			trackName: 'Come Together',
			artistName: 'The Beatles',
			albumName: 'Abbey Road',
		});
	});
});

// These cases assert the observable diagnostics alongside the public fallback.
describe('music failure diagnostics', () => {
	beforeEach(() => {
		vi.stubEnv('LASTFM_USERNAME', 'demo');
		vi.stubEnv('LASTFM_API_KEY', 'secret');
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'empty',
			data: null,
			issues: [],
		});
		vi.mocked(getSpotifyOEmbedResult).mockResolvedValue({
			status: 'skipped',
			data: null,
			issues: [],
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it.each(['LASTFM_USERNAME', 'LASTFM_API_KEY'])(
		'reports missing %s without making a request',
		async (name) => {
			vi.stubEnv(name, ' ');
			const fetchMock = vi.fn();
			vi.stubGlobal('fetch', fetchMock);
			const result = await getMusicSnapshot();
			expect(result.status).toBe('unavailable');
			expect(result.track).toBeNull();
			expect(result.integrations[0].issues[0].code).toBe('missing-configuration');
			expect(fetchMock).not.toHaveBeenCalled();
			expect(findExactSpotifyTrackResult).not.toHaveBeenCalled();
		},
	);

	it('handles rejected requests without exposing provider credentials or exception text', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockRejectedValue(new Error('https://provider/?api_key=secret')),
		);
		const result = await getMusicSnapshot();
		expect(result.status).toBe('unavailable');
		expect(result.track).toBeNull();
		expect(result.integrations[0].issues[0].code).toBe('network-error');
		expect(console.error).toHaveBeenCalledOnce();
		expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toMatchObject({
			reference: result.correlationId,
			classification: 'network-error',
			operation: 'music.lastfm.request',
		});
		expect(JSON.stringify(result)).not.toContain('secret');
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
	});

	it.each([
		{ body: null, code: 'invalid-response' },
		{ body: {}, code: 'invalid-response' },
		{ body: { recenttracks: { track: [{ name: 42 }] } }, code: 'invalid-response' },
		{ body: { error: 10, message: 'secret provider details' }, code: 'api-error' },
	])('reports $code for unusable Last.fm responses', async ({ body, code }) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse(body)),
		);
		const result = await getMusicSnapshot();
		expect(result.status).toBe('unavailable');
		expect(result.integrations[0].issues[0].code).toBe(code);
		expect(findExactSpotifyTrackResult).not.toHaveBeenCalled();
		expect(JSON.stringify(result)).not.toContain('secret provider details');
	});

	it('reports malformed JSON as a parse failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('invalid json')),
		);
		const result = await getMusicSnapshot();
		expect(result.track).toBeNull();
		expect(result.integrations[0].issues[0].code).toBe('invalid-json');
	});

	it('distinguishes empty recent tracks from a failed service without emitting errors', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ recenttracks: { track: [] } })),
		);
		const result = await getMusicSnapshot();
		expect(result.status).toBe('empty');
		expect(result.integrations.map(({ status }) => status)).toEqual([
			'empty',
			'skipped',
			'skipped',
		]);
		expect(console.error).not.toHaveBeenCalled();
		expect(console.warn).not.toHaveBeenCalled();
	});

	it('keeps the track and search fallback after a failed Spotify scrape', async () => {
		stubLastFmResponse(buildTrack());
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'failed',
			data: null,
			issues: [
				{
					integration: 'spotify-search',
					operation: 'launch',
					code: 'browser-launch-failed',
				},
			],
		});
		const result = await getMusicSnapshot();
		expect(result.status).toBe('degraded');
		expect(result.track?.trackName).toBe('Come Together');
		expect(result.track?.spotifyUrl).toBe(SPOTIFY_SEARCH_FALLBACK_URL);
		expect(getSpotifyOEmbedResult).not.toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it('keeps the exact Spotify link when artwork fails', async () => {
		stubLastFmResponse(buildTrack());
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'success',
			data: SPOTIFY_TRACK_URL,
			issues: [],
		});
		vi.mocked(getSpotifyOEmbedResult).mockResolvedValue({
			status: 'failed',
			data: null,
			issues: [
				{
					integration: 'spotify-artwork',
					operation: 'request',
					code: 'http-error',
					httpStatus: 429,
				},
			],
		});
		const result = await getMusicSnapshot();
		expect(result.status).toBe('degraded');
		expect(result.track?.spotifyUrl).toBe(SPOTIFY_TRACK_URL);
		expect(result.track?.artworkUrl).toBeNull();
		expect(console.warn).toHaveBeenCalledOnce();
		expect(JSON.parse(vi.mocked(console.warn).mock.calls[0][0])).toMatchObject({
			reference: result.correlationId,
			classification: 'http-error',
			operation: 'music.spotify-artwork.request',
		});
	});

	it('drops unsafe Last.fm links without dropping the song', async () => {
		stubLastFmResponse(buildTrack({ url: 'javascript:alert(1)' }));
		const result = await getMusicSnapshot();
		expect(result.track?.lastFmUrl).toBeNull();
		expect(result.track?.trackName).toBe('Come Together');
		expect(result.status).toBe('degraded');
	});

	it('encodes configured credentials as individual query parameters', async () => {
		vi.stubEnv('LASTFM_USERNAME', 'a&user=b');
		vi.stubEnv('LASTFM_API_KEY', 'key&limit=100');
		const fetchMock = stubLastFmResponse(buildTrack());
		await getTrack();
		const url = new URL(String(fetchMock.mock.calls[0][0]));
		expect(url.searchParams.get('user')).toBe('a&user=b');
		expect(url.searchParams.get('api_key')).toBe('key&limit=100');
		expect(url.searchParams.get('limit')).toBe('1');
	});
});
