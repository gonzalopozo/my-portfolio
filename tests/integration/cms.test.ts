import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { openDatabase } from '../../db/client';
import { temporaryDatabase } from '../fixtures/database';
import {
	projects,
	projectSkills,
	experiences,
	experienceSkills,
	skills,
	siteSettings,
	employmentHistory,
	socialLinks,
} from '../../db/schema';
import { eq } from 'drizzle-orm';

const context = vi.hoisted(() => ({
	db: undefined as unknown as ReturnType<typeof openDatabase>['db'],
	allowed: true,
	updateTag: vi.fn(),
	revalidatePath: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/db', () => ({
	get db() {
		return context.db;
	},
}));
vi.mock('@/lib/admin', () => ({
	requireAdmin: async () => {
		if (!context.allowed) throw new Error('Access denied.');
	},
	requireAdminPage: async () => {
		if (!context.allowed) throw new Error('Access denied.');
	},
}));
vi.mock('next/cache', () => ({
	updateTag: context.updateTag,
	revalidatePath: context.revalidatePath,
	cacheTag: vi.fn(),
	cacheLife: vi.fn(),
}));
vi.mock('next/navigation', () => ({
	redirect: (path: string) => {
		throw new Error(`REDIRECT:${path}`);
	},
}));
vi.mock('@/lib/og-image', () => ({
	saveImageInVercelBlob: vi.fn(async () => ({
		ok: false,
		error: { code: 'no-source', stage: 'page-url', reference: 'synthetic-reference' },
	})),
	deleteOldImageInVercelBlob: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/skill-icons/storage', () => ({
	uploadSkillIcon: vi.fn(),
	deleteSkillIcon: vi.fn(async () => {}),
}));

import * as projectActions from '@/lib/actions/projects';
import * as experienceActions from '@/lib/actions/experiences';
import * as skillActions from '@/lib/actions/skills';
import * as socialActions from '@/lib/actions/social-links';
import { updateSiteSettings } from '@/lib/actions/settings';
import { getPublicProjects, getProjectById } from '@/lib/queries/projects';
import { getPublicExperiences, getExperienceById } from '@/lib/queries/experiences';
import {
	getPublicUsedSkills,
	getAllSkills,
	getSkillById,
	getSkillOptions,
} from '@/lib/queries/skills';
import {
	getPublicSocialLinks,
	getSocialLinks,
	getAllSocialLinks,
	getSocialLinkById,
} from '@/lib/queries/social-links';
import { getInfoAboutMe, getPublicInfoAboutMe } from '@/lib/queries/about-me';
import { getSiteSettings } from '@/lib/queries/settings';

let fixture: Awaited<ReturnType<typeof temporaryDatabase>>;
beforeEach(async () => {
	fixture = await temporaryDatabase();
	context.db = fixture.db;
	context.allowed = true;
	vi.clearAllMocks();
});
afterEach(async () => {
	await fixture.close();
});
function form(values: Record<string, string | string[]>) {
	const data = new FormData();
	for (const [name, value] of Object.entries(values))
		for (const item of Array.isArray(value) ? value : [value]) data.append(name, item);
	return data;
}
const projectForm = (extra: Record<string, string | string[]> = {}) =>
	form({
		title: 'Integration project',
		description: 'Real database mutation',
		status: 'active',
		skillIds: ['1'],
		...extra,
	});
const experienceForm = (extra: Record<string, string | string[]> = {}) =>
	form({
		role: 'Integration role',
		company: 'Fixture Company',
		description: 'Real database mutation',
		skillIds: ['1'],
		startDate: '2025-01-01',
		...extra,
	});

describe('CMS actions against complete migrated databases', () => {
	it('creates, updates, clears associations and deletes projects', async () => {
		await expect(projectActions.createProject(projectForm())).rejects.toThrow(
			'REDIRECT:/dashboard/projects',
		);
		const row = await fixture.db.query.projects.findFirst({
			where: eq(projects.title, 'Integration project'),
		});
		expect(row?.order).toBe(2);
		expect(
			(await getPublicProjects()).find((project) => project.id === row!.id)?.projectSkills,
		).toHaveLength(1);
		await expect(
			projectActions.updateProject(
				row!.id,
				projectForm({ title: 'Edited project', skillIds: [] }),
			),
		).rejects.toThrow('REDIRECT:/dashboard/projects');
		expect((await getProjectById(row!.id))?.title).toBe('Edited project');
		expect(
			await fixture.db
				.select()
				.from(projectSkills)
				.where(eq(projectSkills.projectId, row!.id)),
		).toEqual([]);
		await projectActions.deleteProject(row!.id);
		expect(await getProjectById(row!.id)).toBeUndefined();
		expect(context.updateTag).toHaveBeenCalled();
	});
	it('rolls back project creation and editing when a referenced skill is missing', async () => {
		await expect(
			projectActions.createProject(projectForm({ skillIds: ['999'] })),
		).rejects.toThrow();
		expect(await fixture.db.select().from(projects)).toHaveLength(1);
		await expect(
			projectActions.updateProject(1, projectForm({ skillIds: ['999'] })),
		).rejects.toThrow();
		expect((await getProjectById(1))?.title).toBe('Synthetic portfolio project');
		expect(context.updateTag).not.toHaveBeenCalled();
	});
	it('normalizes project ordering gaps atomically and rejects invalid positions', async () => {
		await fixture.db.update(projects).set({ order: 5 }).where(eq(projects.id, 1));
		await fixture.db
			.insert(projects)
			.values({ id: 2, title: 'Second', description: 'Fixture', order: 10 });
		expect(await projectActions.updateProjectOrder(2, 1)).toBe('Second');
		expect((await getPublicProjects()).map((row) => [row.id, row.order])).toEqual([
			[2, 1],
			[1, 2],
		]);
		expect(await projectActions.updateProjectOrder(2, 1)).toBe('');
		await expect(projectActions.updateProjectOrder(2, 3)).rejects.toThrow();
		await expect(projectActions.updateProjectOrder(999, 1)).rejects.toThrow();
		await expect(projectActions.updateProjectOrder(-1, 1)).rejects.toThrow();
	});
	it('creates, edits and removes experiences with actual relations', async () => {
		await expect(experienceActions.createExperience(experienceForm())).rejects.toThrow(
			'REDIRECT:/dashboard/experiences',
		);
		const row = await fixture.db.query.experiences.findFirst({
			where: eq(experiences.role, 'Integration role'),
		});
		expect((await getExperienceById(row!.id))?.experienceSkills).toHaveLength(1);
		await expect(
			experienceActions.updateExperience(
				row!.id,
				experienceForm({ role: 'Edited role', skillIds: [] }),
			),
		).rejects.toThrow('REDIRECT:/dashboard/experiences');
		expect((await getPublicExperiences()).some((row) => row.role === 'Edited role')).toBe(true);
		expect(
			await fixture.db
				.select()
				.from(experienceSkills)
				.where(eq(experienceSkills.experienceId, row!.id)),
		).toEqual([]);
		await experienceActions.deleteExperience(row!.id);
		expect(await getExperienceById(row!.id)).toBeUndefined();
	});
	it('rolls back experience data when association replacement fails', async () => {
		await expect(
			experienceActions.createExperience(experienceForm({ skillIds: ['999'] })),
		).rejects.toThrow();
		await expect(
			experienceActions.updateExperience(1, experienceForm({ skillIds: ['999'] })),
		).rejects.toThrow();
		expect((await getExperienceById(1))?.role).toBe('Fixture Developer');
		expect(await fixture.db.select().from(experiences)).toHaveLength(1);
		await expect(experienceActions.updateExperience(999, experienceForm())).rejects.toThrow(
			'not found',
		);
	});
	it('writes employment history exactly once per transition and rolls it back on failure', async () => {
		const data = form({ resumeUrl: 'https://example.test/new.pdf', statusMessage: 'Updated' });
		await updateSiteSettings(data);
		await updateSiteSettings(data);
		expect(await fixture.db.select().from(employmentHistory)).toHaveLength(1);
		expect((await getPublicInfoAboutMe())?.isEmployed).toBe(false);
		await fixture.client.execute(
			"CREATE TRIGGER reject_settings BEFORE UPDATE ON site_settings BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;",
		);
		data.set('isEmployed', 'on');
		await expect(updateSiteSettings(data)).rejects.toThrow();
		expect(await fixture.db.select().from(employmentHistory)).toHaveLength(1);
		expect((await getSiteSettings())?.isEmployed).toBe(false);
	});
	it('creates, edits and deletes skills; deleting a skill clears both relation tables', async () => {
		const data = form({ name: 'New skill', type: 'frontend', icon: 'SiReact' });
		await expect(skillActions.createSkill({ error: null }, data)).rejects.toThrow('REDIRECT:');
		const row = await fixture.db.query.skills.findFirst({
			where: eq(skills.name, 'New skill'),
		});
		data.set('name', 'Updated skill');
		await expect(skillActions.updateSkill(row!.id, { error: null }, data)).rejects.toThrow(
			'REDIRECT:',
		);
		expect((await getSkillById(row!.id))?.name).toBe('Updated skill');
		await skillActions.deleteSkill(1);
		expect(await fixture.db.select().from(projectSkills)).toEqual([]);
		expect(await fixture.db.select().from(experienceSkills)).toEqual([]);
		await skillActions.deleteSkill(row!.id);
		expect(await getAllSkills()).toEqual([]);
	});
	it('creates, edits, orders and deletes social links', async () => {
		const data = form({ name: 'New link', url: 'https://example.test/new', color: '#123456' });
		await expect(socialActions.createSocialLink({ error: null }, data)).rejects.toThrow(
			'REDIRECT:',
		);
		const row = await fixture.db.query.socialLinks.findFirst({
			where: eq(socialLinks.name, 'New link'),
		});
		data.set('name', 'Updated link');
		await expect(
			socialActions.updateSocialLink(row!.id, { error: null }, data),
		).rejects.toThrow('REDIRECT:');
		await socialActions.updateSocialLinkOrder(row!.id, 1);
		expect((await getPublicSocialLinks())[0].name).toBe('Updated link');
		await socialActions.deleteSocialLink(row!.id);
		expect(await getSocialLinkById(row!.id)).toBeUndefined();
		expect(await getSocialLinks()).toHaveLength(1);
		expect(await getAllSocialLinks()).toHaveLength(1);
	});
	it('ranks used skills across both junctions and excludes unused records or records without icons', async () => {
		await fixture.db.insert(skills).values([
			{ id: 2, name: 'Unused', icon: 'SiReact' },
			{ id: 3, name: 'Without an icon' },
		]);
		await fixture.db.insert(projectSkills).values({ projectId: 1, skillId: 3 });
		expect((await getPublicUsedSkills()).map((row) => [row.id, row.usageCount])).toEqual([
			[1, 2],
		]);
		expect(await getSkillOptions()).toHaveLength(3);
		expect((await getPublicSocialLinks())[0]).not.toHaveProperty('createdAt');
		expect(await getPublicInfoAboutMe()).not.toHaveProperty('id');
	});
	it('rejects private query access and mutations independently of page/proxy checks', async () => {
		context.allowed = false;
		for (const operation of [
			() => getProjectById(1),
			() => getExperienceById(1),
			() => getSkillOptions(),
			() => getSiteSettings(),
			() => getInfoAboutMe(),
			() => getSocialLinks(),
			() => projectActions.createProject(projectForm()),
			() => experienceActions.deleteExperience(1),
			() => skillActions.deleteSkill(1),
			() => socialActions.deleteSocialLink(1),
			() => updateSiteSettings(new FormData()),
		])
			await expect(operation()).rejects.toThrow('Access denied.');
		expect(await fixture.db.select().from(projects)).toHaveLength(1);
		expect(await fixture.db.select().from(siteSettings)).toHaveLength(1);
		expect(context.updateTag).not.toHaveBeenCalled();
	});
});
