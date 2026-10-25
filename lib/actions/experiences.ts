'use server';

import { db } from '@/db';
import { observeOperation } from '@/lib/observability/operation';
import { experiences, experienceSkills } from '@/db/schema/portfolio';
import { requireAdmin } from '@/lib/admin';
import { experienceSchema } from '@/lib/schemas/experiences';
import { entityIdSchema } from '@/lib/schemas/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { revalidatePath, updateTag } from 'next/cache';
import { PUBLIC_EXPERIENCES_CACHE_TAG } from '@/lib/cache-tags';

interface ExperienceSkill {
	experienceId: number;
	skillId: number;
}

function validateExperienceId(id: number) {
	if (!entityIdSchema.safeParse(id).success) throw new Error('Invalid experience.');
}

function parseExperience(formData: FormData) {
	const result = experienceSchema.safeParse({
		role: formData.get('role'),
		company: formData.get('company'),
		companyUrl: formData.get('companyUrl') ?? '',
		companyLogo: formData.get('companyLogo') ?? '',
		description: formData.get('description'),
		startDate: formData.get('startDate') ?? '',
		endDate: formData.get('endDate') ?? '',
		location: formData.get('location') ?? '',
		skillIds: formData.getAll('skillIds'),
	});
	if (!result.success) throw new Error('Invalid experience data.');
	return result.data;
}

export async function createExperience(formData: FormData) {
	await requireAdmin();

	const {
		role,
		company,
		companyUrl,
		companyLogo,
		description,
		startDate,
		endDate,
		location,
		skillIds,
	} = parseExperience(formData);

	await observeOperation('cms.experiences.mutate', () =>
		db.transaction(async (tx) => {
			const result = await tx
				.select({ maxOrder: sql<number>`COALESCE(MAX(${experiences.order}), 0)` })
				.from(experiences);
			const newOrder = result[0].maxOrder + 1;

			const experienceSkillsData = skillIds;

			const experienceIdData = await tx
				.insert(experiences)
				.values({
					role,
					company,
					companyUrl: companyUrl || null,
					companyLogo: companyLogo || null,
					description,
					startDate,
					endDate,
					location,
					order: newOrder,
				})
				.returning({ insertedId: experiences.id });

			const experienceSkillsInsert: ExperienceSkill[] = experienceSkillsData.map((skill) => {
				return { experienceId: experienceIdData[0].insertedId, skillId: skill };
			});

			if (experienceSkillsInsert.length) {
				await tx.insert(experienceSkills).values(experienceSkillsInsert);
			}
		}),
	);

	updateTag(PUBLIC_EXPERIENCES_CACHE_TAG);
	redirect('/dashboard/experiences');
}

export async function updateExperience(id: number, formData: FormData) {
	await requireAdmin();

	validateExperienceId(id);
	const {
		role,
		company,
		companyUrl,
		companyLogo,
		description,
		startDate,
		endDate,
		location,
		skillIds,
	} = parseExperience(formData);

	await observeOperation('cms.experiences.mutate', () =>
		db.transaction(async (tx) => {
			const experienceIdData = await tx
				.update(experiences)
				.set({
					role,
					company,
					companyUrl: companyUrl || null,
					companyLogo: companyLogo || null,
					description,
					startDate,
					endDate,
					location,
				})
				.where(eq(experiences.id, id))
				.returning({ insertedId: experiences.id });

			if (!experienceIdData[0]) throw new Error('Experience not found.');
			const experienceSkillsData = skillIds;

			const experienceSkillsToReview: ExperienceSkill[] = experienceSkillsData.map(
				(skill) => {
					return { experienceId: experienceIdData[0].insertedId, skillId: skill };
				},
			);

			const formerExperienceSkills: ExperienceSkill[] =
				await tx.query.experienceSkills.findMany({
					where: eq(experienceSkills.experienceId, id),
					columns: {
						experienceId: true,
						skillId: true,
					},
				});

			const formerExperienceSkillIds = new Set(
				formerExperienceSkills.map((skill) => skill.skillId),
			);
			const experienceSkillsToInsert = experienceSkillsToReview.filter(
				(skillToReview) => !formerExperienceSkillIds.has(skillToReview.skillId),
			);

			if (experienceSkillsToInsert.length > 0) {
				await tx.insert(experienceSkills).values(experienceSkillsToInsert);
			}

			const nextExperienceSkillIds = new Set(
				experienceSkillsToReview.map((skill) => skill.skillId),
			);
			const experienceSkillIdsToDelete = formerExperienceSkills.reduce<number[]>(
				(skillIds, formerSkill) => {
					if (!nextExperienceSkillIds.has(formerSkill.skillId)) {
						skillIds.push(formerSkill.skillId);
					}

					return skillIds;
				},
				[],
			);

			if (experienceSkillIdsToDelete.length > 0) {
				await tx
					.delete(experienceSkills)
					.where(
						and(
							eq(experienceSkills.experienceId, id),
							inArray(experienceSkills.skillId, experienceSkillIdsToDelete),
						),
					);
			}
		}),
	);

	updateTag(PUBLIC_EXPERIENCES_CACHE_TAG);
	redirect('/dashboard/experiences');
}

export async function deleteExperience(id: number) {
	await requireAdmin();
	validateExperienceId(id);

	await observeOperation('cms.experiences.delete', () =>
		db.delete(experiences).where(eq(experiences.id, id)),
	);

	updateTag(PUBLIC_EXPERIENCES_CACHE_TAG);
	revalidatePath('/dashboard/experiences');
}
