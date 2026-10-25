import { z } from '@/lib/zod';
import { optionalWebUrlSchema } from './common';

export const settingsSchema = z.object({
	isEmployed: z.boolean(),
	resumeUrl: optionalWebUrlSchema,
	statusMessage: z.string().trim().max(500),
});
