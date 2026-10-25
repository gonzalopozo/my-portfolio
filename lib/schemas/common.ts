import { z } from '@/lib/zod';
import { safeWebUrl } from '@/lib/security/urls';

export const entityIdSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const skillIdsSchema = z
	.array(
		z.union([
			z
				.string()
				.regex(/^[1-9]\d*$/)
				.transform(Number),
			entityIdSchema,
		]),
	)
	.max(200)
	.pipe(z.array(entityIdSchema))
	.transform((ids) => [...new Set(ids)]);
const webUrlSchema = z
	.string()
	.trim()
	.max(2048)
	.refine((value) => !!safeWebUrl(value));
export const optionalWebUrlSchema = z.union([webUrlSchema, z.literal('')]);
export const optionalHttpsUrlSchema = optionalWebUrlSchema.refine(
	(value) => !value || safeWebUrl(value)?.startsWith('https://') === true,
);
