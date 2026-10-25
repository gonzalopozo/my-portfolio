// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	requireAdminPage: vi.fn(),
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	findMany: vi.fn(),
	findFirst: vi.fn(),
	put: vi.fn(),
	del: vi.fn(),
	updateTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({
	requireAdmin: mocks.requireAdmin,
	requireAdminPage: mocks.requireAdminPage,
}));
vi.mock('@/db', () => ({
	db: {
		select: mocks.select,
		insert: mocks.insert,
		update: mocks.update,
		delete: mocks.delete,
		query: {
			projects: { findMany: mocks.findMany, findFirst: mocks.findFirst },
			siteSettings: { findFirst: mocks.findFirst },
		},
	},
}));
vi.mock('@vercel/blob', () => ({ put: mocks.put, del: mocks.del }));
vi.mock('next/cache', () => ({
	updateTag: mocks.updateTag,
	revalidatePath: vi.fn(),
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

import {
	createProject,
	updateProject,
	deleteProject,
	updateProjectOrder,
	refreshProjectOgImage,
} from '@/lib/actions/projects';
import { createExperience, updateExperience, deleteExperience } from '@/lib/actions/experiences';
import { updateSiteSettings } from '@/lib/actions/settings';
import { getProjects, getProjectById } from '@/lib/queries/projects';
import { getSiteSettings } from '@/lib/queries/settings';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockRejectedValue(new Error('Access denied.'));
	mocks.requireAdminPage.mockRejectedValue(new Error('Access denied.'));
});

describe('administrative operation boundaries', () => {
	it('rejects every project/experience/settings mutation before database or Blob access', async () => {
		const form = new FormData();
		for (const operation of [
			() => createProject(form),
			() => updateProject(1, form),
			() => deleteProject(1),
			() => updateProjectOrder(1, 1),
			() => refreshProjectOgImage(1),
			() => createExperience(form),
			() => updateExperience(1, form),
			() => deleteExperience(1),
			() => updateSiteSettings(form),
		])
			await expect(operation()).rejects.toThrow('Access denied.');
		for (const dependency of [
			mocks.select,
			mocks.insert,
			mocks.update,
			mocks.delete,
			mocks.put,
			mocks.del,
			mocks.updateTag,
		]) {
			expect(dependency).not.toHaveBeenCalled();
		}
	});
	it('rejects private query entrypoints independently of page guards', async () => {
		for (const operation of [
			() => getProjects(),
			() => getProjectById(1),
			() => getSiteSettings(),
		]) {
			await expect(operation()).rejects.toThrow('Access denied.');
		}
		expect(mocks.findMany).not.toHaveBeenCalled();
		expect(mocks.findFirst).not.toHaveBeenCalled();
	});
	it('rejects invalid authorized form data before querying or writing', async () => {
		mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' } });
		await expect(createProject(new FormData())).rejects.toThrow('Invalid project data.');
		await expect(createExperience(new FormData())).rejects.toThrow('Invalid experience data.');
		const settings = new FormData();
		settings.set('resumeUrl', 'javascript:alert(1)');
		await expect(updateSiteSettings(settings)).rejects.toThrow('Invalid settings data.');
		expect(mocks.select).not.toHaveBeenCalled();
		expect(mocks.insert).not.toHaveBeenCalled();
		expect(mocks.update).not.toHaveBeenCalled();
	});
});
