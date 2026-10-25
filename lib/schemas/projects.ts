import { z } from '@/lib/zod';
import { optionalHttpsUrlSchema, optionalWebUrlSchema, skillIdsSchema } from './common';

export const projectSchema = z.object({
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().min(1).max(10000),
	url: optionalHttpsUrlSchema,
	repoUrl: optionalWebUrlSchema,
	status: z.enum(['active', 'archived', 'in-progress']),
	skillIds: skillIdsSchema,
});
