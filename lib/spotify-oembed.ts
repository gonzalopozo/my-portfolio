import 'server-only';
import { fetchMusicJson, type MusicFetcher } from '@/lib/music-request';
import { reportMusicIssues } from '@/lib/music-diagnostics';
import type { MusicResult } from '@/lib/music-status';
import { spotifyOEmbedSchema } from '@/lib/schemas/music';
import { validateSpotifyArtworkUrl, validateSpotifyTrackUrl } from '@/lib/spotify-utils';

const SPOTIFY_OEMBED_ENDPOINT = 'https://open.spotify.com/oembed';

interface SpotifyOEmbedOptions {
	fetcher?: MusicFetcher;
}

/** Compatibility entrypoint; detailed callers report issues with their snapshot ID. */
export async function getSpotifyOEmbedThumbnailUrl(
	spotifyUrl: string,
	options: SpotifyOEmbedOptions = {},
): Promise<string | null> {
	const result = await getSpotifyOEmbedResult(spotifyUrl, options);
	if (result.issues.length) reportMusicIssues(result.issues);
	return result.data;
}

export async function getSpotifyOEmbedResult(
	spotifyUrl: string,
	options: SpotifyOEmbedOptions = {},
): Promise<MusicResult<string>> {
	const trackUrl = validateSpotifyTrackUrl(spotifyUrl);
	if (!trackUrl) {
		return {
			status: 'failed',
			data: null,
			issues: [
				{ integration: 'spotify-artwork', operation: 'validation', code: 'invalid-url' },
			],
		};
	}

	const url = new URL(SPOTIFY_OEMBED_ENDPOINT);
	url.search = new URLSearchParams({ url: trackUrl }).toString();
	const response = await fetchMusicJson(url, 'spotify-artwork', options.fetcher);
	if (response.status !== 'success') return response;

	const embed = spotifyOEmbedSchema.safeParse(response.data);
	if (!embed.success) {
		return {
			status: 'failed',
			data: null,
			issues: [
				{
					integration: 'spotify-artwork',
					operation: 'validation',
					code: 'invalid-response',
				},
			],
		};
	}

	const thumbnailUrl = validateSpotifyArtworkUrl(embed.data.thumbnail_url);
	if (!thumbnailUrl) {
		return {
			status: 'failed',
			data: null,
			issues: [
				{ integration: 'spotify-artwork', operation: 'validation', code: 'invalid-url' },
			],
		};
	}
	return { status: 'success', data: thumbnailUrl, issues: [] };
}
