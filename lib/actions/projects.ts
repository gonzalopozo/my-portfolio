'use server';

import { db } from '@/db';
import { observeOperation } from '@/lib/observability/operation';
import { projects, projectSkills } from '@/db/schema/portfolio';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { projectSchema } from '@/lib/schemas/projects';
import { entityIdSchema } from '@/lib/schemas/common';
import { revalidatePath, updateTag } from 'next/cache';
import { PUBLIC_PROJECTS_CACHE_TAG } from '@/lib/cache-tags';
import { requireAdmin } from '@/lib/admin';
import { saveImageInVercelBlob } from '@/lib/og-image';
import { ImageBudget } from '@/lib/og-image/budget';
import {
	cleanupImageOperation,
	persistProjectImage,
	recordImageCleanup,
} from '@/lib/og-image/store';
import { reportOgImageError } from '@/lib/og-image-errors';
import {
	getOgImageWarningRedirect,
	type OgImageError,
	type ProjectImageActionResult,
} from '@/lib/og-image-feedback';

interface ProjectSkill {
	projectId: number;
	skillId: number;
}

function validateProjectId(id: number) {
	if (!entityIdSchema.safeParse(id).success) throw new Error('Invalid project.');
}

function parseProject(formData: FormData) {
	const result = projectSchema.safeParse({
		title: formData.get('title'),
		description: formData.get('description'),
		url: formData.get('url') ?? '',
		repoUrl: formData.get('repoUrl') ?? '',
		status: formData.get('status'),
		skillIds: formData.getAll('skillIds'),
	});
	if (!result.success) throw new Error('Invalid project data.');
	return result.data;
}

/** Persist through a durable operation; uncertain writes are reconciled without deletion. */
async function replaceProjectImage(
	projectId: number,
	url: string,
	previousImage: string | null,
	budget = new ImageBudget(),
): Promise<ProjectImageActionResult> {
	const uploaded = await saveImageInVercelBlob(url, projectId, previousImage, budget);
	if (!uploaded.ok) return uploaded;
	return persistProjectImage(uploaded.operationId, url, budget);
}

function getImageIssue(result: ProjectImageActionResult): OgImageError | undefined {
	return result.ok ? result.warning : result.error;
}

export async function createProject(formData: FormData) {
	await requireAdmin();

	const { title, description, url, repoUrl, status, skillIds } = parseProject(formData);

	const newProjectId = await observeOperation('cms.projects.mutate', () =>
		db.transaction(async (tx) => {
			const result = await tx
				.select({ maxOrder: sql<number>`COALESCE(MAX(${projects.order}), 0)` })
				.from(projects);
			const newOrder = result[0].maxOrder + 1;

			const projectSkillsData = skillIds;

			const projectIdData = await tx
				.insert(projects)
				.values({
					title,
					description,
					url: url || null,
					repoUrl: repoUrl || null,
					status,
					order: newOrder,
				})
				.returning({ insertedId: projects.id });

			const newProjectId = projectIdData[0].insertedId;

			const projectSkillsInsert: ProjectSkill[] = projectSkillsData.map((skill) => {
				return { projectId: newProjectId, skillId: skill };
			});

			if (projectSkillsInsert.length)
				await tx.insert(projectSkills).values(projectSkillsInsert);

			return newProjectId;
		}),
	);

	const imageIssue = url
		? getImageIssue(await replaceProjectImage(newProjectId, url, null))
		: undefined;

	updateTag(PUBLIC_PROJECTS_CACHE_TAG);
	revalidatePath('/');
	redirect(
		getOgImageWarningRedirect(
			imageIssue
				? { projectId: newProjectId, operation: 'create', error: imageIssue }
				: undefined,
		),
	);
}

export async function updateProject(id: number, formData: FormData) {
	await requireAdmin();

	validateProjectId(id);
	const { title, description, url, repoUrl, status, skillIds } = parseProject(formData);

	const oldUrls = await db
		.select({ url: projects.url, ogImageUrl: projects.ogImageUrl })
		.from(projects)
		.where(eq(projects.id, id));

	if (!oldUrls[0]) throw new Error('Project not found.');
	const oldOpenGraphImageUrl = oldUrls[0].ogImageUrl;

	await observeOperation('cms.projects.mutate', () =>
		db.transaction(async (tx) => {
			await tx
				.update(projects)
				.set({
					title,
					description,
					url: url || null,
					repoUrl: repoUrl || null,
					status,
				})
				.where(eq(projects.id, id));

			const projectSkillsData = skillIds;

			const projectSkillsToReview: ProjectSkill[] = projectSkillsData.map((skill) => {
				return { projectId: id, skillId: skill };
			});

			const formerProjectSkills: ProjectSkill[] = await tx.query.projectSkills.findMany({
				where: eq(projectSkills.projectId, id),
				columns: {
					projectId: true,
					skillId: true,
				},
			});

			const formerProjectSkillIds = new Set(
				formerProjectSkills.map((skill) => skill.skillId),
			);
			const projectSkillsToInsert = projectSkillsToReview.filter(
				(skillToReview) => !formerProjectSkillIds.has(skillToReview.skillId),
			);

			if (projectSkillsToInsert.length > 0) {
				await tx.insert(projectSkills).values(projectSkillsToInsert);
			}

			const nextProjectSkillIds = new Set(
				projectSkillsToReview.map((skill) => skill.skillId),
			);
			const projectSkillIdsToDelete = formerProjectSkills.reduce<number[]>(
				(skillIds, formerSkill) => {
					if (!nextProjectSkillIds.has(formerSkill.skillId)) {
						skillIds.push(formerSkill.skillId);
					}

					return skillIds;
				},
				[],
			);

			if (projectSkillIdsToDelete.length > 0) {
				await tx
					.delete(projectSkills)
					.where(
						and(
							eq(projectSkills.projectId, id),
							inArray(projectSkills.skillId, projectSkillIdsToDelete),
						),
					);
			}
		}),
	);

	let imageIssue: OgImageError | undefined;
	if (url && url !== oldUrls[0].url) {
		imageIssue = getImageIssue(await replaceProjectImage(id, url, oldOpenGraphImageUrl));
	} else if (!url && oldOpenGraphImageUrl) {
		let cleanupId: string | undefined;
		try {
			const budget = new ImageBudget(3000);
			cleanupId = await budget.run(3000, () =>
				db.transaction(async (tx) => {
					const saved = await tx
						.update(projects)
						.set({ ogImageUrl: null })
						.where(
							and(
								eq(projects.id, id),
								isNull(projects.url),
								eq(projects.ogImageUrl, oldOpenGraphImageUrl),
							),
						)
						.returning({ id: projects.id });
					if (!saved.length) return undefined;
					return recordImageCleanup(tx, id, oldOpenGraphImageUrl);
				}),
			);
			if (!cleanupId) imageIssue = reportOgImageError('persist-failed', 'persistence', id);
		} catch {
			imageIssue = reportOgImageError('persistence-uncertain', 'persistence', id);
		}
		if (cleanupId) {
			const cleanup = await cleanupImageOperation(cleanupId);
			if (!cleanup.ok) imageIssue = cleanup.error;
		}
	}

	updateTag(PUBLIC_PROJECTS_CACHE_TAG);
	revalidatePath('/');
	redirect(
		getOgImageWarningRedirect(
			imageIssue ? { projectId: id, operation: 'update', error: imageIssue } : undefined,
		),
	);
}

export async function deleteProject(id: number): Promise<ProjectImageActionResult> {
	await requireAdmin();
	validateProjectId(id);

	let cleanupId: string | undefined;
	try {
		cleanupId = await new ImageBudget(3000).run(3000, () =>
			db.transaction(async (tx) => {
				const [deleted] = await tx
					.delete(projects)
					.where(eq(projects.id, id))
					.returning({ ogImageUrl: projects.ogImageUrl });
				return deleted?.ogImageUrl
					? recordImageCleanup(tx, id, deleted.ogImageUrl)
					: undefined;
			}),
		);
	} catch {
		// A lost transaction response may still mean the row was deleted.
		updateTag(PUBLIC_PROJECTS_CACHE_TAG);
		revalidatePath('/');
		revalidatePath('/dashboard/projects');
		return { ok: false, error: reportOgImageError('persistence-uncertain', 'persistence', id) };
	}
	const cleanup = cleanupId ? await cleanupImageOperation(cleanupId) : ({ ok: true } as const);

	updateTag(PUBLIC_PROJECTS_CACHE_TAG);
	revalidatePath('/');
	revalidatePath('/dashboard/projects');
	return cleanup.ok ? { ok: true } : { ok: true, warning: cleanup.error };
}

export async function updateProjectOrder(projectId: number, newOrder: number): Promise<string> {
	await requireAdmin();
	validateProjectId(projectId);
	if (!entityIdSchema.safeParse(newOrder).success) throw new Error('Invalid project position.');
	const title = await observeOperation('cms.projects.mutate', () =>
		db.transaction(async (tx) => {
			const rows = await tx
				.select({ id: projects.id, title: projects.title, order: projects.order })
				.from(projects)
				.orderBy(asc(projects.order), asc(projects.id));
			if (newOrder > rows.length) throw new Error('Invalid project position.');
			const previous = rows.findIndex((row) => row.id === projectId);
			if (previous < 0) throw new Error('Project not found.');
			if (previous === newOrder - 1 && rows.every((row, index) => row.order === index + 1))
				return '';
			const [moved] = rows.splice(previous, 1);
			rows.splice(newOrder - 1, 0, moved);
			const positions = rows.map((row, index) => sql`WHEN ${row.id} THEN ${index + 1}`);
			await tx
				.update(projects)
				.set({ order: sql`CASE ${projects.id} ${sql.join(positions, sql` `)} END` })
				.where(
					inArray(
						projects.id,
						rows.map((row) => row.id),
					),
				);
			return moved.title;
		}),
	);
	if (!title) return '';

	updateTag(PUBLIC_PROJECTS_CACHE_TAG);
	revalidatePath('/');
	revalidatePath('/dashboard/projects');

	return title;
}

export async function refreshProjectOgImage(projectId: number): Promise<ProjectImageActionResult> {
	await requireAdmin();
	if (!entityIdSchema.safeParse(projectId).success) {
		return { ok: false, error: reportOgImageError('invalid-project', 'persistence') };
	}

	const budget = new ImageBudget();
	let project;
	try {
		[project] = await budget.run(3000, () =>
			db
				.select({ url: projects.url, ogImageUrl: projects.ogImageUrl })
				.from(projects)
				.where(eq(projects.id, projectId)),
		);
	} catch {
		return { ok: false, error: reportOgImageError('unexpected', 'persistence', projectId) };
	}
	if (!project) {
		return { ok: false, error: reportOgImageError('not-found', 'persistence', projectId) };
	}
	if (!project.url) {
		return { ok: false, error: reportOgImageError('no-source', 'page-url', projectId) };
	}

	const result = await replaceProjectImage(projectId, project.url, project.ogImageUrl, budget);
	if (!result.ok && result.error.code !== 'persistence-uncertain') return result;

	updateTag(PUBLIC_PROJECTS_CACHE_TAG);
	revalidatePath('/');
	revalidatePath('/dashboard/projects');
	return result;
}
