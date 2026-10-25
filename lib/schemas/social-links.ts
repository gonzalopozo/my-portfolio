import { z } from '@/lib/zod';
import { optionalWebUrlSchema } from './common';

export const DEFAULT_SOCIAL_LINK_COLOR = '#66696d';

export const socialLinkSchema = z.object({
	name: z.string().trim().min(1).max(100),
	url: optionalWebUrlSchema,
	icon: z.string().trim().max(160),
	color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.transform((color) => color.toLowerCase()),
});
