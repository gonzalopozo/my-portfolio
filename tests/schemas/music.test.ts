import { describe, expect, it } from 'vitest';
import { lastFmRecentTracksSchema, spotifyOEmbedSchema } from '@/lib/schemas/music';

describe('music provider schemas', () => {
	it.each([null, {}, { recenttracks: null }, { recenttracks: { track: [{ name: 42 }] } }])(
		'rejects malformed recent-track data: %j',
		(value) => expect(lastFmRecentTracksSchema.safeParse(value).success).toBe(false),
	);

	it.each([{ recenttracks: {} }, { recenttracks: { track: [] } }])(
		'accepts an empty music history: %j',
		(value) => expect(lastFmRecentTracksSchema.safeParse(value).success).toBe(true),
	);

	it('accepts a track without optional artist, album, date, and link metadata', () => {
		expect(
			lastFmRecentTracksSchema.safeParse({
				recenttracks: { track: [{ name: 'Song' }] },
			}).success,
		).toBe(true);
	});

	it('rejects an empty or oversized title', () => {
		for (const name of [' ', 'x'.repeat(1001)]) {
			expect(
				lastFmRecentTracksSchema.safeParse({ recenttracks: { track: [{ name }] } }).success,
			).toBe(false);
		}
	});

	it.each([
		null,
		{ provider_name: 'Other', thumbnail_url: 'https://i.scdn.co/image/a' },
		{ provider_name: 'Spotify', thumbnail_url: 42 },
	])('rejects malformed oEmbed data: %j', (value) => {
		expect(spotifyOEmbedSchema.safeParse(value).success).toBe(false);
	});
});
