import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getSpotifyOEmbedThumbnailUrl, getSpotifyOEmbedResult } from '@/lib/spotify-oembed';

const SPOTIFY_TRACK_URL = 'https://open.spotify.com/track/3qovVqQWqHRZ8B';
const SPOTIFY_THUMBNAIL_URL =
	'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e020e61ccc192d563f763decbb8';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

describe('getSpotifyOEmbedThumbnailUrl', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	});
	afterEach(() => vi.restoreAllMocks());
	it('returns the Spotify oEmbed thumbnail URL', async () => {
		const fetcher = vi.fn(async (input: string | URL) => {
			void input;
			return jsonResponse({
				provider_name: 'Spotify',
				thumbnail_url: SPOTIFY_THUMBNAIL_URL,
				thumbnail_width: 300,
				thumbnail_height: 300,
			});
		});

		const result = await getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL, { fetcher });

		expect(result).toBe(SPOTIFY_THUMBNAIL_URL);
		expect(fetcher).toHaveBeenCalledOnce();
		expect(String(fetcher.mock.calls[0]?.[0])).toBe(
			'https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F3qovVqQWqHRZ8B',
		);
	});

	it('returns null when the response is not usable', async () => {
		const cases = [
			jsonResponse({ provider_name: 'Spotify' }),
			jsonResponse({ provider_name: 'Other', thumbnail_url: SPOTIFY_THUMBNAIL_URL }),
			jsonResponse({ provider_name: 'Spotify', thumbnail_url: '   ' }),
			jsonResponse({ provider_name: 'Spotify', thumbnail_url: SPOTIFY_THUMBNAIL_URL }, 500),
			new Response('not json'),
		];

		for (const response of cases) {
			await expect(
				getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL, {
					fetcher: vi.fn(async () => response),
				}),
			).resolves.toBeNull();
		}
	});

	it('returns null when fetch throws', async () => {
		await expect(
			getSpotifyOEmbedThumbnailUrl(SPOTIFY_TRACK_URL, {
				fetcher: vi.fn(async () => {
					throw new Error('network failed');
				}),
			}),
		).resolves.toBeNull();
	});
});

describe('oEmbed diagnostics', () => {
	it('reports HTTP errors separately from malformed data', async () => {
		const result = await getSpotifyOEmbedResult(SPOTIFY_TRACK_URL, {
			fetcher: async () => jsonResponse({}, 503),
		});
		expect(result.status).toBe('failed');
		expect(result.issues[0]).toMatchObject({ code: 'http-error', httpStatus: 503 });
	});

	it('rejects unsafe input before making a request', async () => {
		const fetcher = vi.fn();
		const result = await getSpotifyOEmbedResult('https://evil.test/track/a', { fetcher });
		expect(result.issues[0].code).toBe('invalid-url');
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('drops artwork that does not match the configured image hosts', async () => {
		const result = await getSpotifyOEmbedResult(SPOTIFY_TRACK_URL, {
			fetcher: async () =>
				jsonResponse({
					provider_name: 'Spotify',
					thumbnail_url: 'https://evil.test/image/a',
				}),
		});
		expect(result.data).toBeNull();
		expect(result.issues[0].code).toBe('invalid-url');
	});
});
