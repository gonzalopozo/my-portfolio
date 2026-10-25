import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdminPage: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/db', async () => {
	const { createClient } = await import('@libsql/client');
	const { drizzle } = await import('drizzle-orm/libsql');
	return { db: drizzle(createClient({ url: 'file::memory:' }), { casing: 'snake_case' }) };
});

import { db } from '@/db';
import { getPublicUsedSkills } from '@/lib/queries/skills';

beforeAll(async () => {
	await db.run(
		sql.raw(
			'CREATE TABLE skills (id INTEGER PRIMARY KEY, name TEXT NOT NULL, icon TEXT, custom_icon_url TEXT, url TEXT, use_color INTEGER NOT NULL DEFAULT 0, custom_color TEXT)',
		),
	);
	await db.run(
		sql.raw(
			'CREATE TABLE project_skills (project_id INTEGER NOT NULL, skill_id INTEGER NOT NULL)',
		),
	);
	await db.run(
		sql.raw(
			'CREATE TABLE experience_skills (experience_id INTEGER NOT NULL, skill_id INTEGER NOT NULL)',
		),
	);
});

beforeEach(async () => {
	await db.run(sql.raw('DELETE FROM project_skills'));
	await db.run(sql.raw('DELETE FROM experience_skills'));
	await db.run(sql.raw('DELETE FROM skills'));
});

describe('getPublicUsedSkills', () => {
	it('includes used custom-only icons and excludes empty and unused icons', async () => {
		await db.run(
			sql.raw(
				"INSERT INTO skills (id, name, icon, custom_icon_url) VALUES (1, 'Custom', NULL, 'https://icons.public.blob.vercel-storage.com/skill-icons/icon.svg'), (2, 'Empty', '', ''), (3, 'Unused', NULL, 'https://icons.public.blob.vercel-storage.com/skill-icons/unused.svg')",
			),
		);
		await db.run(
			sql.raw('INSERT INTO project_skills (project_id, skill_id) VALUES (1, 1), (1, 2)'),
		);
		expect(await getPublicUsedSkills()).toEqual([
			expect.objectContaining({
				name: 'Custom',
				icon: null,
				customIconUrl: expect.stringContaining('/skill-icons/'),
			}),
		]);
	});
	it('combines both association tables and sorts by use count, then name', async () => {
		await db.run(
			sql.raw(
				"INSERT INTO skills (id, name, icon, url, use_color, custom_color) VALUES (1, 'React', 'SiReact|si', 'https://react.dev', 1, '#61dafb'), (2, 'TypeScript', 'SiTypescript|si', NULL, 0, NULL), (3, 'Docker', 'SiDocker|si', NULL, 0, NULL), (4, 'Unused', 'SiGit|si', NULL, 0, NULL), (5, 'Blank', NULL, NULL, 0, NULL)",
			),
		);
		await db.run(
			sql.raw(
				'INSERT INTO project_skills (project_id, skill_id) VALUES (1, 1), (1, 2), (2, 2), (3, 5)',
			),
		);
		await db.run(
			sql.raw(
				'INSERT INTO experience_skills (experience_id, skill_id) VALUES (1, 1), (1, 2), (2, 3)',
			),
		);

		const result = await getPublicUsedSkills();

		expect(result.map(({ name, usageCount }) => [name, usageCount])).toEqual([
			['TypeScript', 3],
			['React', 2],
			['Docker', 1],
		]);
		expect(result[1]).toMatchObject({
			url: 'https://react.dev',
			useColor: true,
			customColor: '#61dafb',
		});
	});

	it('uses a stable alphabetical order for equal use counts', async () => {
		await db.run(
			sql.raw(
				"INSERT INTO skills (id, name, icon) VALUES (1, 'Zod', 'SiZod|si'), (2, 'Astro', 'SiAstro|si')",
			),
		);
		await db.run(sql.raw('INSERT INTO project_skills (project_id, skill_id) VALUES (1, 1)'));
		await db.run(
			sql.raw('INSERT INTO experience_skills (experience_id, skill_id) VALUES (1, 2)'),
		);

		expect((await getPublicUsedSkills()).map(({ name }) => name)).toEqual(['Astro', 'Zod']);
	});
});
