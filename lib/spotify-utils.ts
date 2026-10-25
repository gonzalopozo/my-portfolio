export interface SpotifyTrackSearchInput {
	trackName: string;
	artistName: string | null;
	albumName: string | null;
}

export function buildSpotifyTrackSearchUrl(input: SpotifyTrackSearchInput): string | null {
	const track = sanitizeSpotifySearchTerm(input?.trackName);
	const artist = sanitizeSpotifySearchTerm(input?.artistName);
	const album = sanitizeSpotifySearchTerm(input?.albumName);

	if (!track || !artist) return null;

	return `https://open.spotify.com/search/${encodeURIComponent(
		[track, artist, album].filter(Boolean).join(' ').toWellFormed(),
	)}`;
}

function sanitizeSpotifySearchTerm(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 1000) return null;
	const sanitized = value.replace(/\s+/g, ' ').trim();
	return sanitized || null;
}

/** Provider links must stay on HTTPS allowlisted origins, without credentials. */
export function parseMusicProviderUrl(value: unknown): URL | null {
	if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) {
		return null;
	}
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && !url.username && !url.password && !url.port
			? url
			: null;
	} catch {
		return null;
	}
}

export function validateSpotifyTrackUrl(value: unknown): string | null {
	const url = parseMusicProviderUrl(value);
	if (!url || url.hostname !== 'open.spotify.com') return null;
	if (!/^\/(?:intl-[a-z]{2}\/)?track\/[A-Za-z0-9]+\/?$/.test(url.pathname)) return null;
	return `https://open.spotify.com${url.pathname.replace(/^\/intl-[a-z]{2}\//, '/')}`;
}

export function validateSpotifyArtworkUrl(value: unknown): string | null {
	const url = parseMusicProviderUrl(value);
	if (!url) return null;
	const allowedHost =
		url.hostname === 'i.scdn.co' ||
		/^image-cdn-[a-z0-9-]+\.spotifycdn\.com$/.test(url.hostname);
	return allowedHost ? url.href : null;
}
