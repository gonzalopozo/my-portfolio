'use server';

import { db } from '@/db';
import { observeOperation } from '@/lib/observability/operation';
import { skills } from '@/db/schema/portfolio';
import { PUBLIC_EXPERIENCES_CACHE_TAG, PUBLIC_PROJECTS_CACHE_TAG } from '@/lib/cache-tags';
import { skillSchema } from '@/lib/schemas/skills';
import { requireAdmin } from '@/lib/admin';
import { deleteSkillIcon, uploadSkillIcon } from '@/lib/skill-icons/storage';
import { SkillIconValidationError } from '@/lib/skill-icons/svg';
import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export type SkillActionState = { error: string | null };

function parseSkill(formData: FormData) {
	return skillSchema.safeParse({
		name: formData.get('name'),
		type: formData.get('type'),
		icon: formData.get('icon') ?? '',
		useCustomIcon: formData.get('useCustomIcon') === 'on',
		url: formData.get('url') ?? '',
		useColor: formData.get('useColor') === 'on',
		customColor: formData.get('customColor'),
	});
}

async function resolveCustomIcon(
	formData: FormData,
	enabled: boolean,
	existingUrl: string | null,
): Promise<string | null> {
	if (!enabled) return null;
	const file = formData.get('customIcon');
	// React's action transport names an unselected empty file "blob" on the server.
	if (file instanceof File && (file.size > 0 || !['', 'blob'].includes(file.name)))
		return uploadSkillIcon(file);
	if (file !== null && !(file instanceof File))
		throw new SkillIconValidationError('Selecciona un archivo SVG (.svg).');
	if (existingUrl) return existingUrl;
	throw new SkillIconValidationError('Selecciona un archivo SVG para el icono personalizado.');
}

function updatePublicSkillTags() {
	updateTag(PUBLIC_PROJECTS_CACHE_TAG);
	updateTag(PUBLIC_EXPERIENCES_CACHE_TAG);
}

export async function createSkill(
	_previousState: SkillActionState,
	formData: FormData,
): Promise<SkillActionState> {
	await requireAdmin();

	const parsed = parseSkill(formData);
	if (!parsed.success) return { error: 'Revisa los datos de la habilidad y el color.' };

	let customIconUrl: string | null = null;
	const { useCustomIcon, ...data } = parsed.data;
	try {
		customIconUrl = await resolveCustomIcon(formData, useCustomIcon, null);
		await db.insert(skills).values({
			...data,
			customIconUrl,
			icon: parsed.data.icon || null,
			url: parsed.data.url || null,
		});
	} catch (error) {
		await deleteSkillIcon(customIconUrl);
		if (error instanceof SkillIconValidationError) return { error: error.message };
		return { error: 'No se pudo crear la habilidad. Inténtalo de nuevo.' };
	}

	updatePublicSkillTags();
	redirect('/dashboard/skills');
}

export async function updateSkill(
	id: number,
	_previousState: SkillActionState,
	formData: FormData,
): Promise<SkillActionState> {
	await requireAdmin();

	const parsed = parseSkill(formData);
	if (!parsed.success) return { error: 'Revisa los datos de la habilidad y el color.' };
	if (!Number.isSafeInteger(id) || id <= 0) return { error: 'La habilidad no es válida.' };

	let previousIconUrl: string | null = null;
	let customIconUrl: string | null = null;
	const { useCustomIcon, ...data } = parsed.data;
	try {
		const [existing] = await db
			.select({ customIconUrl: skills.customIconUrl })
			.from(skills)
			.where(eq(skills.id, id));
		if (!existing) return { error: 'La habilidad ya no existe.' };
		previousIconUrl = existing.customIconUrl;
		customIconUrl = await resolveCustomIcon(formData, useCustomIcon, previousIconUrl);
		const updated = await db
			.update(skills)
			.set({
				...data,
				customIconUrl,
				icon: parsed.data.icon || null,
				url: parsed.data.url || null,
				customColor: parsed.data.useColor ? parsed.data.customColor : undefined,
			})
			// Avoid retaining or deleting a blob changed by a concurrent save.
			.where(
				and(
					eq(skills.id, id),
					previousIconUrl === null
						? isNull(skills.customIconUrl)
						: eq(skills.customIconUrl, previousIconUrl),
				),
			)
			.returning({ id: skills.id });
		if (updated.length === 0) {
			if (customIconUrl !== previousIconUrl) await deleteSkillIcon(customIconUrl);
			return { error: 'La habilidad ha cambiado. Recarga la página e inténtalo de nuevo.' };
		}
	} catch (error) {
		if (customIconUrl !== previousIconUrl) await deleteSkillIcon(customIconUrl);
		if (error instanceof SkillIconValidationError) return { error: error.message };
		return { error: 'No se pudo guardar la habilidad. Inténtalo de nuevo.' };
	}
	if (previousIconUrl !== customIconUrl) await deleteSkillIcon(previousIconUrl);

	updatePublicSkillTags();
	redirect('/dashboard/skills');
}

export async function deleteSkill(id: number) {
	await requireAdmin();
	if (!Number.isSafeInteger(id) || id <= 0) return;

	const deleted = await observeOperation('cms.skills.delete', () =>
		db
			.delete(skills)
			.where(eq(skills.id, id))
			.returning({ customIconUrl: skills.customIconUrl }),
	);
	if (deleted[0]) await deleteSkillIcon(deleted[0].customIconUrl);

	updatePublicSkillTags();
	revalidatePath('/dashboard/skills');
}
