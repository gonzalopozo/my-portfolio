import 'server-only';
import { observeOperation } from '@/lib/observability/operation';
import { requireAdminPage } from '@/lib/admin';
import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db';
import { PUBLIC_PROJECTS_CACHE_TAG } from '@/lib/cache-tags';
import { type ProjectInfo } from '@/lib/types';
import { entityIdSchema } from '@/lib/schemas/common';

async function findProjects(): Promise<ProjectInfo[]> {
	return await observeOperation('db.projects.read', () =>
		db.query.projects.findMany({
			with: {
				projectSkills: {
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
			orderBy: (projects, { asc }) => [asc(projects.order), asc(projects.id)],
		}),
	);
}

export async function getProjects(): Promise<ProjectInfo[]> {
	await requireAdminPage();
	return await findProjects();
}

export async function getPublicProjects(): Promise<ProjectInfo[]> {
	'use cache';
	cacheLife('hours');
	cacheTag(PUBLIC_PROJECTS_CACHE_TAG);

	return await findProjects();
}

export async function getProjectById(id: number): Promise<ProjectInfo | undefined> {
	await requireAdminPage();
	if (!entityIdSchema.safeParse(id).success) return undefined;
	return await db.query.projects.findFirst({
		where: (projects, { eq }) => eq(projects.id, id),
		with: {
			projectSkills: {
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
		orderBy: (projects, { asc }) => [asc(projects.order), asc(projects.id)],
	});
}
