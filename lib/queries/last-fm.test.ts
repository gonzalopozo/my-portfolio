import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import {
	LASTFM_ENDPOINT,
	SPOTIFY_ARTWORK_ENDPOINT,
	SPOTIFY_TRACK_URL,
	SPOTIFY_THUMBNAIL_URL,
	buildLastFmTrack,
	buildSpotifyArtwork,
	lastFmResponse,
} from '../../tests/fixtures/music';
import { setupNetwork } from '../../tests/fixtures/setup-network';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/spotify-search-scraper', () => ({ findExactSpotifyTrackResult: vi.fn() }));

import { getTrack, getMusicSnapshot } from '@/lib/queries/last-fm';
import { findExactSpotifyTrackResult } from '@/lib/spotify-search-scraper';

const server = setupNetwork(
	http.get(LASTFM_ENDPOINT, () => lastFmResponse([buildLastFmTrack()])),
	http.get(SPOTIFY_ARTWORK_ENDPOINT, () => HttpResponse.json(buildSpotifyArtwork())),
);
const SPOTIFY_SEARCH_FALLBACK_URL =
	'https://open.spotify.com/search/Come%20Together%20The%20Beatles%20Abbey%20Road';

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	vi.stubEnv('LASTFM_USERNAME', 'demo');
	vi.stubEnv('LASTFM_API_KEY', 'secret');
	vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
		status: 'empty',
		data: null,
		issues: [],
	});
});
afterEach(() => {
	vi.clearAllMocks();
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('getTrack', () => {
	it('returns null when Last.fm responds with an error status', async () => {
		server.use(http.get(LASTFM_ENDPOINT, () => new HttpResponse(null, { status: 500 })));
		await expect(getTrack()).resolves.toBeNull();
		expect(findExactSpotifyTrackResult).not.toHaveBeenCalled();
	});

	it('returns null when recent tracks are absent', async () => {
		server.use(http.get(LASTFM_ENDPOINT, () => HttpResponse.json({ recenttracks: {} })));
		await expect(getTrack()).resolves.toBeNull();
	});

	it('returns null when the recent tracks list is empty', async () => {
		server.use(http.get(LASTFM_ENDPOINT, () => lastFmResponse()));
		await expect(getTrack()).resolves.toBeNull();
	});

	it('maps a now-playing track to a Track with isOnline true', async () => {
		server.use(
			http.get(LASTFM_ENDPOINT, () =>
				lastFmResponse([buildLastFmTrack({ '@attr': { nowplaying: 'true' } })]),
			),
		);
		await expect(getTrack()).resolves.toEqual({
			isOnline: true,
			trackName: 'Come Together',
			artistName: 'The Beatles',
			albumName: 'Abbey Road',
			artworkUrl: null,
			lastFmUrl: buildLastFmTrack().url,
			spotifyTrackId: null,
			spotifyUrl: SPOTIFY_SEARCH_FALLBACK_URL,
			spotifyArtworkUrl: null,
			playedAtUnix: null,
			playedAtLabel: null,
		});
	});

	it('maps a recently played track with its playedAt timestamp', async () => {
		server.use(
			http.get(LASTFM_ENDPOINT, () =>
				lastFmResponse([
					buildLastFmTrack({
						date: { uts: '1700000000', '#text': '15 Nov 2023, 12:00' },
					}),
				]),
			),
		);
		const result = await getTrack();
		expect(result?.isOnline).toBe(false);
		expect(result?.playedAtUnix).toBe(1700000000);
		expect(result?.playedAtLabel).toBe('15 Nov 2023, 12:00');
	});

	it('combines Last.fm data and Spotify artwork through the real provider helpers', async () => {
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'success',
			data: SPOTIFY_TRACK_URL,
			issues: [],
		});
		const result = await getMusicSnapshot();
		expect(result.status).toBe('healthy');
		expect(result.track).toMatchObject({
			trackName: 'Come Together',
			artworkUrl: SPOTIFY_THUMBNAIL_URL,
			spotifyArtworkUrl: SPOTIFY_THUMBNAIL_URL,
			spotifyUrl: SPOTIFY_TRACK_URL,
			spotifyTrackId: null,
		});
		expect(result.integrations.map(({ status }) => status)).toEqual([
			'success',
			'success',
			'success',
		]);
	});

	it('falls back to a Spotify search URL when no exact match is found', async () => {
		const result = await getTrack();
		expect(result?.spotifyUrl).toBe(SPOTIFY_SEARCH_FALLBACK_URL);
		expect(result?.artworkUrl).toBeNull();
		expect(result?.spotifyArtworkUrl).toBeNull();
		expect(findExactSpotifyTrackResult).toHaveBeenCalledOnce();
	});

	it('handles missing artist and album fields gracefully', async () => {
		server.use(
			http.get(LASTFM_ENDPOINT, () =>
				lastFmResponse([buildLastFmTrack({ artist: undefined, album: undefined })]),
			),
		);
		const result = await getTrack();
		expect(result?.artistName).toBeNull();
		expect(result?.albumName).toBeNull();
	});

	it('ignores a non-numeric playedAt uts value', async () => {
		server.use(
			http.get(LASTFM_ENDPOINT, () =>
				lastFmResponse([
					buildLastFmTrack({ date: { uts: 'not-a-number', '#text': 'label' } }),
				]),
			),
		);
		const result = await getTrack();
		expect(result?.playedAtUnix).toBeNull();
		expect(result?.playedAtLabel).toBe('label');
	});

	it('builds the request URL with the configured Last.fm credentials', async () => {
		const requested = vi.fn();
		server.use(
			http.get(LASTFM_ENDPOINT, ({ request }) => {
				requested(request.url);
				return lastFmResponse();
			}),
		);
		await getTrack();
		expect(requested).toHaveBeenCalledExactlyOnceWith(
			'https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=demo&api_key=secret&format=json&limit=1',
		);
	});

	it('passes track metadata to the Spotify search', async () => {
		await getTrack();
		expect(findExactSpotifyTrackResult).toHaveBeenCalledWith({
			trackName: 'Come Together',
			artistName: 'The Beatles',
			albumName: 'Abbey Road',
		});
	});
});

describe('music failure diagnostics', () => {
	it.each(['LASTFM_USERNAME', 'LASTFM_API_KEY'])(
		'reports missing %s without making a request',
		async (name) => {
			vi.stubEnv(name, ' ');
			const requested = vi.fn();
			server.use(
				http.get(LASTFM_ENDPOINT, () => {
					requested();
					return lastFmResponse();
				}),
			);
			const result = await getMusicSnapshot();
			expect(result.status).toBe('unavailable');
			expect(result.track).toBeNull();
			expect(result.integrations[0].issues[0].code).toBe('missing-configuration');
			expect(requested).not.toHaveBeenCalled();
			expect(findExactSpotifyTrackResult).not.toHaveBeenCalled();
		},
	);

	it('handles network failures without exposing provider credentials', async () => {
		server.use(http.get(LASTFM_ENDPOINT, () => HttpResponse.error()));
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
		server.use(http.get(LASTFM_ENDPOINT, () => HttpResponse.json(body)));
		const result = await getMusicSnapshot();
		expect(result.status).toBe('unavailable');
		expect(result.integrations[0].issues[0].code).toBe(code);
		expect(findExactSpotifyTrackResult).not.toHaveBeenCalled();
		expect(JSON.stringify(result)).not.toContain('secret provider details');
	});

	it('reports malformed JSON as a parse failure', async () => {
		server.use(http.get(LASTFM_ENDPOINT, () => HttpResponse.text('invalid json')));
		const result = await getMusicSnapshot();
		expect(result.track).toBeNull();
		expect(result.integrations[0].issues[0].code).toBe('invalid-json');
	});

	it('distinguishes empty recent tracks from a failed service without emitting errors', async () => {
		server.use(http.get(LASTFM_ENDPOINT, () => lastFmResponse()));
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
		expect(console.warn).toHaveBeenCalledOnce();
	});

	it('keeps the exact Spotify link when artwork fails', async () => {
		vi.mocked(findExactSpotifyTrackResult).mockResolvedValue({
			status: 'success',
			data: SPOTIFY_TRACK_URL,
			issues: [],
		});
		server.use(
			http.get(SPOTIFY_ARTWORK_ENDPOINT, () => new HttpResponse(null, { status: 429 })),
		);
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
		server.use(
			http.get(LASTFM_ENDPOINT, () =>
				lastFmResponse([buildLastFmTrack({ url: 'javascript:alert(1)' })]),
			),
		);
		const result = await getMusicSnapshot();
		expect(result.track?.lastFmUrl).toBeNull();
		expect(result.track?.trackName).toBe('Come Together');
		expect(result.status).toBe('degraded');
	});

	it('encodes configured credentials as individual query parameters', async () => {
		vi.stubEnv('LASTFM_USERNAME', 'a&user=b');
		vi.stubEnv('LASTFM_API_KEY', 'key&limit=100');
		const requested = vi.fn();
		server.use(
			http.get(LASTFM_ENDPOINT, ({ request }) => {
				requested(Object.fromEntries(new URL(request.url).searchParams));
				return lastFmResponse();
			}),
		);
		await getTrack();
		expect(requested).toHaveBeenCalledExactlyOnceWith({
			method: 'user.getrecenttracks',
			user: 'a&user=b',
			api_key: 'key&limit=100',
			format: 'json',
			limit: '1',
		});
	});
});
