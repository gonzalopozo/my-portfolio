import { z } from '@/lib/zod';
import { optionalHttpsUrlSchema, optionalWebUrlSchema, skillIdsSchema } from './common';

const optionalDate = z
	.union([
		z.iso.date().transform((value) => new Date(value)),
		z.literal('').transform(() => null),
	])
	.nullable();

export const experienceSchema = z
	.object({
		role: z.string().trim().min(1).max(200),
		company: z.string().trim().min(1).max(200),
		companyUrl: optionalWebUrlSchema,
		companyLogo: optionalHttpsUrlSchema,
		description: z.string().trim().min(1).max(10000),
		startDate: optionalDate,
		endDate: optionalDate,
		location: z.string().trim().max(200),
		skillIds: skillIdsSchema,
	})
	.refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
		path: ['endDate'],
		message: 'End date must not precede start date.',
	});
