import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { openDatabase } from '../../db/client';
import { applyMigrations } from '../../scripts/database.mjs';
import {
	users,
	accounts,
	siteSettings,
	skills,
	projects,
	projectSkills,
	experiences,
	experienceSkills,
	socialLinks,
} from '../../db/schema';
import { hashPassword } from 'better-auth/crypto';

export const fixtureUser = {
	id: 'ci-admin',
	email: 'admin@example.test',
	password: 'Synthetic-fixture-password-47!',
};
export const fixtureVisitor = {
	id: 'ci-visitor',
	email: 'visitor@example.test',
	password: 'Synthetic-visitor-password-47!',
};

async function seedDatabase(db: ReturnType<typeof openDatabase>['db']) {
	for (const user of [fixtureUser, fixtureVisitor]) {
		await db
			.insert(users)
			.values({ id: user.id, name: 'Synthetic Test User', email: user.email });
		await db.insert(accounts).values({
			id: `account-${user.id}`,
			accountId: user.id,
			providerId: 'credential',
			userId: user.id,
			password: await hashPassword(user.password),
		});
	}
	await db.insert(siteSettings).values({
		id: 1,
		resumeUrl: 'https://example.test/resume.pdf',
		statusMessage: 'Synthetic portfolio fixture',
		isEmployed: true,
	});
	await db
		.insert(skills)
		.values({ id: 1, name: 'TypeScript fixture', type: 'frontend', icon: 'SiTypescript|si' });
	await db.insert(projects).values({
		id: 1,
		title: 'Synthetic portfolio project',
		description: 'Deterministic integration fixture',
		order: 1,
		status: 'active',
	});
	await db.insert(projectSkills).values({ projectId: 1, skillId: 1 });
	await db.insert(experiences).values({
		id: 1,
		role: 'Fixture Developer',
		company: 'Synthetic Company',
		description: 'Deterministic experience',
		order: 1,
	});
	await db.insert(experienceSkills).values({ experienceId: 1, skillId: 1 });
	await db
		.insert(socialLinks)
		.values({ id: 1, name: 'Fixture link', url: 'https://example.test', order: 1 });
}

export async function temporaryDatabase(seed = true) {
	await mkdir('.ci', { recursive: true });
	const directory = await mkdtemp(resolve('.ci/database-'));
	const url = `file:${directory}/test.db`;
	const connection = openDatabase({ url });
	try {
		await applyMigrations(connection.client);
		if (seed) await seedDatabase(connection.db);
		return {
			...connection,
			url,
			directory,
			close: async () => {
				connection.client.close();
				await rm(directory, { recursive: true, force: true });
			},
		};
	} catch (error) {
		connection.client.close();
		await rm(directory, { recursive: true, force: true });
		throw error;
	}
}
