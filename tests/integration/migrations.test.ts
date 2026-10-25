import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { temporaryDatabase } from '../fixtures/database';
import { applyMigrations } from '../../scripts/database.mjs';
import { projects, projectSkills, skills, users, accounts, sessions } from '../../db/schema';
import { eq } from 'drizzle-orm';

let fixture: Awaited<ReturnType<typeof temporaryDatabase>>;
beforeEach(async () => {
	fixture = await temporaryDatabase();
});
afterEach(async () => {
	await fixture.close();
});

describe('committed migrations and constraints', () => {
	it('reapplies safely without deleting data', async () => {
		await applyMigrations(fixture.client);
		expect(await fixture.db.select().from(projects)).toHaveLength(1);
		expect((await fixture.client.execute('PRAGMA foreign_key_check')).rows).toEqual([]);
	});
	it('enforces foreign keys and composite uniqueness', async () => {
		await expect(
			fixture.db.insert(projectSkills).values({ projectId: 999, skillId: 1 }),
		).rejects.toThrow();
		await expect(
			fixture.db.insert(projectSkills).values({ projectId: 1, skillId: 1 }),
		).rejects.toThrow();
	});
	it('cascades project and skill deletion only to their junctions', async () => {
		await fixture.db.delete(projects).where(eq(projects.id, 1));
		expect(await fixture.db.select().from(projectSkills)).toEqual([]);
		expect(await fixture.db.select().from(skills)).toHaveLength(1);
	});
	it('rolls back a multi-statement write after a constraint failure', async () => {
		await expect(
			fixture.db.transaction(async (tx) => {
				await tx
					.update(projects)
					.set({ title: 'Must roll back' })
					.where(eq(projects.id, 1));
				await tx.insert(projectSkills).values({ projectId: 1, skillId: 999 });
			}),
		).rejects.toThrow();
		expect((await fixture.db.select().from(projects))[0].title).toBe(
			'Synthetic portfolio project',
		);
	});
	it('enforces unique users and cascades authentication records', async () => {
		await expect(
			fixture.db
				.insert(users)
				.values({ id: 'duplicate', name: 'Duplicate', email: 'admin@example.test' }),
		).rejects.toThrow();
		await fixture.db.insert(sessions).values({
			id: 'session',
			userId: 'ci-admin',
			token: 'synthetic-token',
			expiresAt: new Date(Date.now() + 60000),
			updatedAt: new Date(),
		});
		await fixture.db.delete(users).where(eq(users.id, 'ci-admin'));
		expect(await fixture.db.select().from(sessions)).toEqual([]);
		expect(
			await fixture.db.select().from(accounts).where(eq(accounts.userId, 'ci-admin')),
		).toEqual([]);
	});
	it('refuses changed or unknown migration ledger entries', async () => {
		await fixture.client.execute("UPDATE __drizzle_migrations SET hash='untrusted' WHERE id=1");
		await expect(applyMigrations(fixture.client)).rejects.toThrow('verified prefix');
	});
});
