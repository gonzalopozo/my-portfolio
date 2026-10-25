import { z } from '@/lib/zod';

const lastFmTextSchema = z.object({ '#text': z.string().max(1000).optional() });

export const lastFmRecentTracksSchema = z.object({
	recenttracks: z.object({
		track: z
			.array(
				z.object({
					name: z.string().trim().min(1).max(1000),
					'@attr': z.object({ nowplaying: z.string().optional() }).optional(),
					artist: lastFmTextSchema.optional(),
					album: lastFmTextSchema.optional(),
					url: z.string().max(2048).optional(),
					date: z
						.object({
							uts: z.string().max(32).optional(),
							'#text': z.string().max(1000).optional(),
						})
						.optional(),
				}),
			)
			.max(10)
			.optional(),
	}),
});

export const lastFmApiErrorSchema = z.object({ error: z.number().int().positive().max(999) });

export const spotifyOEmbedSchema = z.object({
	provider_name: z.literal('Spotify'),
	thumbnail_url: z.string().trim().min(1).max(2048),
});

export const spotifySearchResultSchema = z.object({
	bodyText: z.string().max(100_000),
	candidates: z
		.array(z.object({ href: z.string().max(2048), text: z.string().max(1000) }))
		.max(100),
});
