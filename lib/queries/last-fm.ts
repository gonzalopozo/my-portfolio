import 'server-only';
import { randomUUID } from 'node:crypto';
import { cacheLife, cacheTag } from 'next/cache';
import { MUSIC_CACHE_TAG } from '@/lib/cache-tags';
import { fetchMusicJson } from '@/lib/music-request';
import { reportMusicIssues } from '@/lib/music-diagnostics';
import type { MusicIntegrationStatus, MusicResult, MusicSnapshot } from '@/lib/music-status';
import { lastFmApiErrorSchema, lastFmRecentTracksSchema } from '@/lib/schemas/music';
import { getSpotifyOEmbedResult } from '@/lib/spotify-oembed';
import { buildSpotifyTrackSearchUrl, parseMusicProviderUrl } from '@/lib/spotify-utils';
import { findExactSpotifyTrackResult } from '@/lib/spotify-search-scraper';
import type { Track } from '@/lib/types';
import type { z } from '@/lib/zod';

type LastFmTrackJSON = NonNullable<
	z.infer<typeof lastFmRecentTracksSchema>['recenttracks']['track']
>[number];

/** Public callers receive track data only, never administrative diagnostics. */
export async function getTrack(): Promise<Track | null> {
	return (await getMusicSnapshot()).track;
}

/** One cache entry keeps the public fallback and administrative status consistent. */
export async function getMusicSnapshot(): Promise<MusicSnapshot> {
	'use cache';
	cacheLife({ stale: 30, revalidate: 60, expire: 300 });
	cacheTag(MUSIC_CACHE_TAG);

	const lastFm = await getLastFmTrackResult();
	const integrations: MusicIntegrationStatus[] = [
		{ integration: 'lastfm', status: lastFm.status, issues: lastFm.issues },
	];
	let track: Track | null = null;

	if (lastFm.status === 'success') {
		const trackJSON = lastFm.data;
		const artistName = trackJSON.artist?.['#text']?.trim() || null;
		const albumName = trackJSON.album?.['#text']?.trim() || null;
		const searchInput = { trackName: trackJSON.name, artistName, albumName };
		const search = await findExactSpotifyTrackResult(searchInput);
		const artwork: MusicResult<string> = search.data
			? await getSpotifyOEmbedResult(search.data)
			: { status: 'skipped', data: null, issues: [] };

		integrations.push(
			{ integration: 'spotify-search', status: search.status, issues: search.issues },
			{ integration: 'spotify-artwork', status: artwork.status, issues: artwork.issues },
		);
		track = {
			isOnline: trackJSON['@attr']?.nowplaying === 'true',
			trackName: trackJSON.name,
			artistName,
			albumName,
			artworkUrl: artwork.data,
			lastFmUrl: validateLastFmUrl(trackJSON.url),
			spotifyTrackId: null,
			spotifyUrl: search.data ?? buildSpotifyTrackSearchUrl(searchInput),
			spotifyArtworkUrl: artwork.data,
			playedAtUnix: parsePlayedAtUnix(trackJSON.date?.uts),
			playedAtLabel: trackJSON.date?.['#text'] ?? null,
		};
	} else {
		integrations.push(
			{ integration: 'spotify-search', status: 'skipped', issues: [] },
			{ integration: 'spotify-artwork', status: 'skipped', issues: [] },
		);
	}

	const issues = integrations.flatMap((integration) => integration.issues);
	const correlationId = randomUUID();
	const snapshot: MusicSnapshot = {
		track,
		status:
			lastFm.status === 'failed'
				? 'unavailable'
				: lastFm.status === 'empty'
					? 'empty'
					: issues.length
						? 'degraded'
						: 'healthy',
		checkedAt: new Date().toISOString(),
		correlationId,
		integrations,
	};
	if (issues.length) reportMusicIssues(issues, correlationId);
	return snapshot;
}

async function getLastFmTrackResult(): Promise<MusicResult<LastFmTrackJSON>> {
	const username = process.env.LASTFM_USERNAME?.trim();
	const apiKey = process.env.LASTFM_API_KEY?.trim();
	if (!username || !apiKey) {
		return {
			status: 'failed',
			data: null,
			issues: [
				{
					integration: 'lastfm',
					operation: 'configuration',
					code: 'missing-configuration',
				},
			],
		};
	}

	const url = new URL('https://ws.audioscrobbler.com/2.0/');
	url.search = new URLSearchParams({
		method: 'user.getrecenttracks',
		user: username,
		api_key: apiKey,
		format: 'json',
		limit: '1',
	}).toString();
	const response = await fetchMusicJson(url, 'lastfm');
	if (response.status !== 'success') return response;

	const apiError = lastFmApiErrorSchema.safeParse(response.data);
	if (apiError.success) {
		return {
			status: 'failed',
			data: null,
			issues: [
				{
					integration: 'lastfm',
					operation: 'request',
					code: 'api-error',
					apiCode: apiError.data.error,
				},
			],
		};
	}

	const parsed = lastFmRecentTracksSchema.safeParse(response.data);
	if (!parsed.success) {
		return {
			status: 'failed',
			data: null,
			issues: [{ integration: 'lastfm', operation: 'validation', code: 'invalid-response' }],
		};
	}
	const track = parsed.data.recenttracks.track?.[0];
	if (!track) return { status: 'empty', data: null, issues: [] };

	return {
		status: 'success',
		data: track,
		issues:
			track.url && !validateLastFmUrl(track.url)
				? [{ integration: 'lastfm', operation: 'validation', code: 'invalid-url' }]
				: [],
	};
}

function validateLastFmUrl(value: unknown): string | null {
	const url = parseMusicProviderUrl(value);
	return url && ['last.fm', 'www.last.fm'].includes(url.hostname) ? url.href : null;
}

function parsePlayedAtUnix(value: string | undefined): number | null {
	if (!value?.trim()) return null;
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
