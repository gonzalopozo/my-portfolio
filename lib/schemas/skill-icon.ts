import { z } from '@/lib/zod';

export const MAX_SKILL_ICON_BYTES = 256 * 1024;
export const SKILL_ICON_ACCEPT = '.svg,image/svg+xml';

const skillIconFileSchema = z.object({
	name: z.string().regex(/\.svg$/i, 'Selecciona un archivo SVG (.svg).'),
	type: z.enum(['image/svg+xml', ''], 'Selecciona un archivo SVG (.svg).'),
	size: z
		.number()
		.min(1, 'El archivo SVG está vacío.')
		.max(MAX_SKILL_ICON_BYTES, 'El icono no puede superar los 256 KiB.'),
});

export function getSkillIconFileError(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
	const result = skillIconFileSchema.safeParse(file);
	return result.success ? null : result.error.issues[0].message;
}
