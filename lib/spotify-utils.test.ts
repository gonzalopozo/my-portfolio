import { describe, expect, it } from 'vitest';
import { buildSpotifyTrackSearchUrl } from '@/lib/spotify-utils';

describe('buildSpotifyTrackSearchUrl', () => {
	it('builds a Spotify web search URL without calling the Spotify API', () => {
		expect(
			buildSpotifyTrackSearchUrl({
				trackName: 'Cuando Calienta El Sol',
				artistName: 'Luis Miguel',
				albumName: 'Soy Como Quiero Ser',
			}),
		).toBe(
			'https://open.spotify.com/search/Cuando%20Calienta%20El%20Sol%20Luis%20Miguel%20Soy%20Como%20Quiero%20Ser',
		);
	});

	it('returns null when the artist is missing', () => {
		expect(
			buildSpotifyTrackSearchUrl({
				trackName: 'Come Together',
				artistName: null,
				albumName: 'Abbey Road',
			}),
		).toBeNull();
	});
});

// Invalid external metadata must not throw before a fallback can be built.
describe('search input resilience', () => {
	it('repairs unpaired Unicode surrogates before URL encoding', () => {
		expect(
			buildSpotifyTrackSearchUrl({
				trackName: 'Song\ud800',
				artistName: 'Artist',
				albumName: null,
			}),
		).toBe('https://open.spotify.com/search/Song%EF%BF%BD%20Artist');
	});

	it('rejects invalid runtime metadata without throwing', () => {
		expect(
			buildSpotifyTrackSearchUrl({
				trackName: 42 as unknown as string,
				artistName: 'Artist',
				albumName: null,
			}),
		).toBeNull();
		expect(
			buildSpotifyTrackSearchUrl(
				null as unknown as Parameters<typeof buildSpotifyTrackSearchUrl>[0],
			),
		).toBeNull();
	});
});
