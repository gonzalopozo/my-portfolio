import 'server-only';
import { observeOperation } from '@/lib/observability/operation';
import { requireAdminPage } from '@/lib/admin';
import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db';
import { PUBLIC_EXPERIENCES_CACHE_TAG } from '@/lib/cache-tags';
import { type ExperienceData } from '@/lib/types';
import { entityIdSchema } from '@/lib/schemas/common';

async function findExperiences(): Promise<ExperienceData[]> {
	return await observeOperation('db.experiences.read', () =>
		db.query.experiences.findMany({
			with: {
				experienceSkills: {
					columns: {},
					with: {
						skill: {
							columns: {
								id: true,
								name: true,
								icon: true,
								customIconUrl: true,
							},
						},
					},
				},
			},
			orderBy: (experiences, { asc }) => [asc(experiences.order), asc(experiences.id)],
		}),
	);
}

export async function getExperiences(): Promise<ExperienceData[]> {
	await requireAdminPage();
	return await findExperiences();
}

export async function getPublicExperiences(): Promise<ExperienceData[]> {
	'use cache';
	cacheLife('hours');
	cacheTag(PUBLIC_EXPERIENCES_CACHE_TAG);

	return await findExperiences();
}

export async function getExperienceById(id: number): Promise<ExperienceData | undefined> {
	await requireAdminPage();
	if (!entityIdSchema.safeParse(id).success) return undefined;
	return await db.query.experiences.findFirst({
		where: (experiences, { eq }) => eq(experiences.id, id),
		with: {
			experienceSkills: {
				columns: {},
				with: {
					skill: {
						columns: {
							id: true,
							name: true,
							icon: true,
							customIconUrl: true,
						},
					},
				},
			},
		},
		orderBy: (experiences, { asc }) => [asc(experiences.order), asc(experiences.id)],
	});
}
