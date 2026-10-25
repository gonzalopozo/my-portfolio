import { describe, expect, it } from 'vitest';
import { validateSpotifyArtworkUrl, validateSpotifyTrackUrl } from '@/lib/spotify-utils';

describe('provider URL validation', () => {
	it.each([
		'javascript:alert(1)',
		'http://open.spotify.com/track/abc',
		'https://open.spotify.com.evil.test/track/abc',
		'https://user:password@open.spotify.com/track/abc',
		'https://open.spotify.com:8443/track/abc',
		'https://open.spotify.com/track/abc/extra',
		'https://evil.test/track/abc',
	])('rejects unsafe track URL %s', (value) => {
		expect(validateSpotifyTrackUrl(value)).toBeNull();
	});

	it('normalizes localized links and removes query parameters', () => {
		expect(
			validateSpotifyTrackUrl('https://open.spotify.com/intl-es/track/abc?si=tracking'),
		).toBe('https://open.spotify.com/track/abc');
	});

	it.each(['https://i.scdn.co/image/a', 'https://image-cdn-fa.spotifycdn.com/image/a'])(
		'accepts configured Spotify artwork host %s',
		(value) => {
			expect(validateSpotifyArtworkUrl(value)).toBe(value);
		},
	);

	it.each([
		'https://i.scdn.co.evil.test/image/a',
		'https://spotifycdn.com/image/a',
		'https://evil.test/image/a',
		'http://i.scdn.co/image/a',
		'https://password@i.scdn.co/image/a',
	])('rejects unsafe artwork URL %s', (value) => {
		expect(validateSpotifyArtworkUrl(value)).toBeNull();
	});
});
