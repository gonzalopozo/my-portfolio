import { z } from '@/lib/zod';
import { optionalWebUrlSchema } from './common';

export const DEFAULT_SKILL_COLOR = '#66696d';

const hexColor = z
	.string()
	.regex(/^#[0-9a-f]{6}$/i)
	.transform((color) => color.toLowerCase());

export const skillSchema = z
	.object({
		name: z.string().trim().min(1).max(100),
		type: z.enum([
			'fullstack',
			'frontend',
			'backend',
			'database',
			'devops',
			'practices',
			'tools',
			'other',
		]),
		icon: z.string().trim().max(160),
		useCustomIcon: z.boolean().default(false),
		url: optionalWebUrlSchema,
		useColor: z.boolean(),
		customColor: z.union([hexColor, z.null()]),
	})
	.refine((skill) => !skill.useColor || skill.customColor !== null, {
		path: ['customColor'],
		message: 'Selecciona un color válido.',
	});
