import 'server-only';
import { requireAdminPage } from '@/lib/admin';
import { cacheLife, cacheTag } from 'next/cache';
import { and, asc, count, desc, eq, isNotNull, ne, or } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/sqlite-core';
import { db } from '@/db';
import { experienceSkills, projectSkills, skills } from '@/db/schema/portfolio';
import { PUBLIC_EXPERIENCES_CACHE_TAG, PUBLIC_PROJECTS_CACHE_TAG } from '@/lib/cache-tags';
import { entityIdSchema } from '@/lib/schemas/common';

export async function getAllSkills() {
	await requireAdminPage();
	return await db.select().from(skills);
}

export async function getSkillById(id: number): Promise<typeof skills.$inferSelect | undefined> {
	await requireAdminPage();
	if (!entityIdSchema.safeParse(id).success) return undefined;
	const [skill] = await db.select().from(skills).where(eq(skills.id, id));
	return skill;
}

export async function getSkillOptions() {
	await requireAdminPage();
	return await db.select({ id: skills.id, name: skills.name }).from(skills);
}

export async function getPublicUsedSkills() {
	'use cache';
	cacheLife('hours');
	cacheTag(PUBLIC_PROJECTS_CACHE_TAG, PUBLIC_EXPERIENCES_CACHE_TAG);

	const usedSkillIds = unionAll(
		db.select({ skillId: projectSkills.skillId }).from(projectSkills),
		db.select({ skillId: experienceSkills.skillId }).from(experienceSkills),
	).as('used_skill_ids');

	return db
		.select({
			id: skills.id,
			name: skills.name,
			icon: skills.icon,
			customIconUrl: skills.customIconUrl,
			url: skills.url,
			useColor: skills.useColor,
			customColor: skills.customColor,
			usageCount: count(usedSkillIds.skillId),
		})
		.from(skills)
		.innerJoin(usedSkillIds, eq(skills.id, usedSkillIds.skillId))
		.where(
			or(
				and(isNotNull(skills.icon), ne(skills.icon, '')),
				and(isNotNull(skills.customIconUrl), ne(skills.customIconUrl, '')),
			),
		)
		.groupBy(skills.id)
		.orderBy(desc(count(usedSkillIds.skillId)), asc(skills.name), asc(skills.id));
}
