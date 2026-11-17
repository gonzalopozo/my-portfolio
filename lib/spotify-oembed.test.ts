import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw/http';
import {
	SPOTIFY_ARTWORK_ENDPOINT,
	SPOTIFY_TRACK_URL,
	SPOTIFY_THUMBNAIL_URL,
	buildSpotifyArtwork,
} from '../tests/fixtures/music';
import { setupNetwork } from '../tests/fixtures/setup-network';

vi.mock('server-only', () => ({}));

import { getSpotifyOEmbedThumbnailUrl, getSpotifyOEmbedResult } from '@/lib/spotify-oembed';

const server = setupNetwork(
	http.get(SPOTIFY_ARTWORK_ENDPOINT, () => HttpResponse.json(buildSpotifyArtwork())),
);

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('getSpotifyOEmbedThumbnailUrl', () => {
	it('returns the Spotify oEmbed thumbnail URL', async () => {
		await expect(getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL)).resolves.toBe(
			SPOTIFY_THUMBNAIL_URL,
		);
	});

	it('encodes the track URL as an oEmbed query parameter', async () => {
		const requested = vi.fn();
		server.use(
			http.get(SPOTIFY_ARTWORK_ENDPOINT, ({ request }) => {
				requested(request.url);
				return HttpResponse.json(buildSpotifyArtwork());
			}),
		);
		await getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL);
		expect(requested).toHaveBeenCalledExactlyOnceWith(
			'https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F3qovVqQWqHRZ8B',
		);
	});

	it.each([
		{ name: 'missing thumbnail', body: { provider_name: 'Spotify' } },
		{
			name: 'incorrect provider',
			body: { provider_name: 'Other', thumbnail_url: SPOTIFY_THUMBNAIL_URL },
		},
		{ name: 'blank thumbnail', body: buildSpotifyArtwork({ thumbnail_url: '   ' }) },
	])('returns null for $name', async ({ body }) => {
		server.use(http.get(SPOTIFY_ARTWORK_ENDPOINT, () => HttpResponse.json(body)));
		await expect(getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL)).resolves.toBeNull();
	});

	it('returns null after an HTTP failure', async () => {
		server.use(
			http.get(SPOTIFY_ARTWORK_ENDPOINT, () => new HttpResponse(null, { status: 500 })),
		);
		await expect(getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL)).resolves.toBeNull();
	});

	it('returns null after malformed JSON', async () => {
		server.use(http.get(SPOTIFY_ARTWORK_ENDPOINT, () => HttpResponse.text('not json')));
		await expect(getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL)).resolves.toBeNull();
	});

	it('returns null after a network failure', async () => {
		server.use(http.get(SPOTIFY_ARTWORK_ENDPOINT, () => HttpResponse.error()));
		await expect(getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL)).resolves.toBeNull();
	});
});

describe('oEmbed diagnostics', () => {
	it('reports HTTP errors separately from malformed data', async () => {
		server.use(
			http.get(SPOTIFY_ARTWORK_ENDPOINT, () => new HttpResponse(null, { status: 503 })),
		);
		const result = await getSpotifyOEmbedResult(SPOTIFY_TRACK_URL);
		expect(result.status).toBe('failed');
		expect(result.issues[0]).toMatchObject({ code: 'http-error', httpStatus: 503 });
	});

	it('rejects unsafe input before making a request', async () => {
		const requested = vi.fn();
		server.use(
			http.get(SPOTIFY_ARTWORK_ENDPOINT, () => {
				requested();
				return HttpResponse.json(buildSpotifyArtwork());
			}),
		);
		const result = await getSpotifyOEmbedResult('https://evil.test/track/a');
		expect(result.issues[0].code).toBe('invalid-url');
		expect(requested).not.toHaveBeenCalled();
	});

	it('drops artwork that does not match the configured image hosts', async () => {
		server.use(
			http.get(SPOTIFY_ARTWORK_ENDPOINT, () =>
				HttpResponse.json(
					buildSpotifyArtwork({ thumbnail_url: 'https://evil.test/image/a' }),
				),
			),
		);
		const result = await getSpotifyOEmbedResult(SPOTIFY_TRACK_URL);
		expect(result.data).toBeNull();
		expect(result.issues[0].code).toBe('invalid-url');
	});
});
