'use server';

import { db } from '@/db';
import { observeOperation } from '@/lib/observability/operation';
import { socialLinks } from '@/db/schema/portfolio';
import { requireAdmin } from '@/lib/admin';
import { asc, eq, sql } from 'drizzle-orm';
import { PUBLIC_SOCIAL_LINKS_CACHE_TAG } from '@/lib/cache-tags';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { socialLinkSchema } from '@/lib/schemas/social-links';
import { entityIdSchema } from '@/lib/schemas/common';

export type SocialLinkActionState = { error: string | null };

function parseSocialLink(formData: FormData) {
	return socialLinkSchema.safeParse({
		name: formData.get('name'),
		url: formData.get('url'),
		icon: formData.get('icon') ?? '',
		color: formData.get('color'),
	});
}

export async function createSocialLink(
	_previousState: SocialLinkActionState,
	formData: FormData,
): Promise<SocialLinkActionState> {
	await requireAdmin();

	const parsed = parseSocialLink(formData);
	if (!parsed.success)
		return { error: 'Revisa los datos del enlace y selecciona un color válido.' };

	try {
		const result = await db
			.select({ maxOrder: sql<number>`COALESCE(MAX(${socialLinks.order}), 0)` })
			.from(socialLinks);
		const order = result[0].maxOrder + 1;

		await db.insert(socialLinks).values({
			...parsed.data,
			icon: parsed.data.icon || null,
			order,
		});
	} catch {
		return { error: 'No se pudo crear el enlace. Inténtalo de nuevo.' };
	}

	updateTag(PUBLIC_SOCIAL_LINKS_CACHE_TAG);
	redirect('/dashboard/social-links');
}

export async function updateSocialLink(
	id: number,
	_previousState: SocialLinkActionState,
	formData: FormData,
): Promise<SocialLinkActionState> {
	await requireAdmin();
	if (!entityIdSchema.safeParse(id).success) return { error: 'El enlace no es válido.' };

	const parsed = parseSocialLink(formData);
	if (!parsed.success)
		return { error: 'Revisa los datos del enlace y selecciona un color válido.' };

	try {
		await db
			.update(socialLinks)
			.set({ ...parsed.data, icon: parsed.data.icon || null })
			.where(eq(socialLinks.id, id));
	} catch {
		return { error: 'No se pudo guardar el enlace. Inténtalo de nuevo.' };
	}

	updateTag(PUBLIC_SOCIAL_LINKS_CACHE_TAG);
	redirect('/dashboard/social-links');
}

export async function deleteSocialLink(id: number) {
	await requireAdmin();
	if (!entityIdSchema.safeParse(id).success) throw new Error('Invalid social link.');

	await observeOperation('cms.social_links.delete', () =>
		db.delete(socialLinks).where(eq(socialLinks.id, id)),
	);

	updateTag(PUBLIC_SOCIAL_LINKS_CACHE_TAG);
	revalidatePath('/dashboard/social-links');
}

/**
 * Move a link to a one-based position and close ordering gaps atomically.
 * Invalidate the public links cache and refresh the dashboard after saving.
 *
 * @returns The link name, or an empty string if its position is unchanged.
 * @throws Redirects to /login if unauthenticated; rejects invalid moves or failed writes.
 */
export async function updateSocialLinkOrder(
	socialLinkId: number,
	newOrder: number,
): Promise<string> {
	await requireAdmin();

	if (
		!Number.isSafeInteger(socialLinkId) ||
		socialLinkId < 1 ||
		!Number.isSafeInteger(newOrder) ||
		newOrder < 1
	)
		throw new Error('El enlace y la posición deben ser enteros positivos.');

	const name = await observeOperation('cms.social-links.mutate', () =>
		db.transaction(async (tx) => {
			const links = await tx
				.select({ id: socialLinks.id, name: socialLinks.name, order: socialLinks.order })
				.from(socialLinks)
				.orderBy(asc(socialLinks.order), asc(socialLinks.id));
			const oldIndex = links.findIndex((link) => link.id === socialLinkId);
			if (oldIndex === -1) throw new Error('No se encontró el enlace.');
			if (newOrder > links.length) throw new Error('La posición está fuera de la lista.');
			if (oldIndex === newOrder - 1) return '';

			const [moved] = links.splice(oldIndex, 1);
			links.splice(newOrder - 1, 0, moved);

			for (const [index, link] of links.entries()) {
				const order = index + 1;
				if (link.order === order) continue;
				await tx.update(socialLinks).set({ order }).where(eq(socialLinks.id, link.id));
			}

			return moved.name;
		}),
	);

	if (name) {
		updateTag(PUBLIC_SOCIAL_LINKS_CACHE_TAG);
		revalidatePath('/dashboard/social-links');
	}

	return name;
}
