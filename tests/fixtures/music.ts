import { HttpResponse } from 'msw/http';
import type { z } from '../../lib/zod';
import type { lastFmRecentTracksSchema, spotifyOEmbedSchema } from '../../lib/schemas/music';

export const LASTFM_ENDPOINT = 'https://ws.audioscrobbler.com/2.0/';
export const SPOTIFY_ARTWORK_ENDPOINT = 'https://open.spotify.com/oembed';
export const SPOTIFY_TRACK_URL = 'https://open.spotify.com/track/3qovVqQWqHRZ8B';
export const SPOTIFY_THUMBNAIL_URL =
	'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e020e61ccc192d563f763decbb8';

type LastFmTrack = NonNullable<
	z.infer<typeof lastFmRecentTracksSchema>['recenttracks']['track']
>[number];
type SpotifyArtwork = z.infer<typeof spotifyOEmbedSchema>;

export function buildLastFmTrack(overrides: Partial<LastFmTrack> = {}): LastFmTrack {
	return {
		name: 'Come Together',
		artist: { '#text': 'The Beatles' },
		album: { '#text': 'Abbey Road' },
		url: 'https://www.last.fm/music/The+Beatles/_/Come+Together',
		...overrides,
	};
}

export function lastFmResponse(tracks: LastFmTrack[] = []) {
	return HttpResponse.json({ recenttracks: { track: tracks } });
}

export function buildSpotifyArtwork(overrides: Partial<SpotifyArtwork> = {}): SpotifyArtwork {
	return { provider_name: 'Spotify', thumbnail_url: SPOTIFY_THUMBNAIL_URL, ...overrides };
}
