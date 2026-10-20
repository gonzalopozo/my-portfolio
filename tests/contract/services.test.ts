import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openDatabase } from '../../db/client';
import { projects, projectSkills } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { del, head, put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';

const databaseName = process.env.TURSO_CONTRACT_DATABASE_NAME;
if (
	process.env.APP_ENV !== 'contract' ||
	!/^ci-[0-9]+-[a-f0-9]{8}$/.test(databaseName ?? '') ||
	!process.env.TURSO_DATABASE_URL?.startsWith(`libsql://${databaseName}-`)
)
	throw new Error('Remote test isolation is not proven.');
const store = new URL(process.env.CONTRACT_BLOB_ORIGIN ?? '');
if (
	store.protocol !== 'https:' ||
	!store.hostname.endsWith('.public.blob.vercel-storage.com') ||
	store.origin !== process.env.CONTRACT_BLOB_ORIGIN ||
	process.env.CONTRACT_BLOB_ORIGIN === process.env.PRODUCTION_BLOB_ORIGIN
)
	throw new Error('An explicit nonproduction Blob store is required.');
const tokenStore = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[3];
if (
	!process.env.PRODUCTION_BLOB_ORIGIN ||
	!tokenStore ||
	`${tokenStore.toLowerCase()}.public.blob.vercel-storage.com` !== store.hostname
)
	throw new Error('Blob token store identity does not match the isolated store.');
const connection = openDatabase({
	url: process.env.TURSO_DATABASE_URL!,
	authToken: process.env.TURSO_AUTH_TOKEN,
});
beforeAll(async () => {
	await connection.client.execute('PRAGMA foreign_keys = ON');
});
afterAll(() => connection.client.close());

describe('remote service fidelity', () => {
	it('preserves transactions and constraints through the Turso transport', async () => {
		await expect(
			connection.db.transaction(async (tx) => {
				const [row] = await tx
					.insert(projects)
					.values({ title: 'Must roll back', description: 'Synthetic contract' })
					.returning();
				await tx.insert(projectSkills).values({ projectId: row.id, skillId: 999 });
			}),
		).rejects.toThrow();
		expect(await connection.db.select().from(projects)).toEqual([]);
	});
	it('supports conditional writes and migration timestamps on remote libSQL', async () => {
		const [row] = await connection.db
			.insert(projects)
			.values({ title: 'Remote fixture', description: 'Synthetic contract' })
			.returning();
		expect(row.createdAt).toBeInstanceOf(Date);
		const changes = await connection.db
			.update(projects)
			.set({ title: 'Updated' })
			.where(eq(projects.id, row.id))
			.returning();
		expect(changes).toHaveLength(1);
		await connection.db.delete(projects).where(eq(projects.id, row.id));
	});
	it('uploads, reads and deletes only an owned Blob fixture', async () => {
		let owned: string | undefined;
		try {
			const blob = await put(
				`ci/${process.env.GITHUB_RUN_ID}/${randomUUID()}.txt`,
				'Synthetic service contract',
				{
					access: 'public',
					token: process.env.BLOB_READ_WRITE_TOKEN,
					addRandomSuffix: true,
				},
			);
			if (new URL(blob.url).origin !== store.origin)
				throw new Error('Blob token points to an unexpected store.');
			owned = blob.url;
			expect(
				(await head(owned, { token: process.env.BLOB_READ_WRITE_TOKEN })).size,
			).toBeGreaterThan(0);
			const response = await fetch(owned, {
				redirect: 'error',
				signal: AbortSignal.timeout(10000),
			});
			expect(await response.text()).toBe('Synthetic service contract');
		} finally {
			if (owned) await del(owned, { token: process.env.BLOB_READ_WRITE_TOKEN });
		}
	});
});
