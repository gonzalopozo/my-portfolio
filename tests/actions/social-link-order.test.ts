// @vitest-environment node

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	updateTag: vi.fn(),
	revalidatePath: vi.fn(),
	redirect: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-session', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('next/cache', () => ({
	updateTag: mocks.updateTag,
	revalidatePath: mocks.revalidatePath,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/db', async () => {
	const { createClient } = await import('@libsql/client');
	const { drizzle } = await import('drizzle-orm/libsql');
	const schema = await import('@/db/schema');
	return {
		// Shared cache keeps the table visible when the driver swaps connections mid-transaction.
		db: drizzle(createClient({ url: 'file::memory:?cache=shared' }), {
			schema,
			casing: 'snake_case',
		}),
	};
});

import { db } from '@/db';
import { socialLinks } from '@/db/schema/portfolio';
import { updateSocialLinkOrder } from '@/lib/actions/social-links';
import { PUBLIC_SOCIAL_LINKS_CACHE_TAG } from '@/lib/cache-tags';
import { getPublicSocialLinks, getSocialLinks } from '@/lib/queries/social-links';

const initialLinks = [
	{ id: 10, name: 'GitHub', order: 1 },
	{ id: 30, name: 'LinkedIn', order: 2 },
	{ id: 20, name: 'Bluesky', order: 3 },
	{ id: 40, name: 'Website', order: 4 },
];

async function readPositions() {
	return db
		.select({ id: socialLinks.id, order: socialLinks.order })
		.from(socialLinks)
		.orderBy(asc(socialLinks.order), asc(socialLinks.id));
}

beforeAll(async () => {
	await db.run(
		sql.raw(`
		CREATE TABLE social_links (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			url TEXT NOT NULL,
			icon TEXT,
			background_color TEXT NOT NULL,
			"order" INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)
	`),
	);
});

beforeEach(async () => {
	vi.clearAllMocks();
	vi.stubEnv('ADMIN_USER_IDS', 'admin');
	mocks.getServerSession.mockResolvedValue({ user: { id: 'admin' } });
	mocks.redirect.mockImplementation(() => {
		throw new Error('redirect');
	});
	await db.run(sql.raw('DROP TRIGGER IF EXISTS reject_order'));
	await db.delete(socialLinks);
	await db.insert(socialLinks).values(
		initialLinks.map((link) => ({
			...link,
			url: `https://example.com/${link.id}`,
			icon: 'SiGithub | si',
			color: '#123456',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			updatedAt: new Date('2026-01-01T00:00:00Z'),
		})),
	);
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});
afterAll(() => db.$client.close());

describe('social link order persistence', () => {
	it.each([
		{ id: 10, position: 4, name: 'GitHub', expectedIds: [30, 20, 40, 10] },
		{ id: 40, position: 1, name: 'Website', expectedIds: [40, 10, 30, 20] },
		{ id: 30, position: 3, name: 'LinkedIn', expectedIds: [10, 20, 30, 40] },
	])(
		'moves link $id to position $position and refreshes both views',
		async ({ id, position, name, expectedIds }) => {
			expect(await updateSocialLinkOrder(id, position)).toBe(name);
			expect(await readPositions()).toEqual(
				expectedIds.map((id, index) => ({ id, order: index + 1 })),
			);
			expect((await getSocialLinks()).map((link) => link.id)).toEqual(expectedIds);
			expect((await getPublicSocialLinks()).map((link) => link.id)).toEqual(expectedIds);
			expect(mocks.updateTag).toHaveBeenCalledWith(PUBLIC_SOCIAL_LINKS_CACHE_TAG);
			expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/social-links');
		},
	);

	it('closes gaps left by deleting a link', async () => {
		await db.delete(socialLinks).where(eq(socialLinks.id, 30));
		await updateSocialLinkOrder(40, 1);

		expect(await readPositions()).toEqual([
			{ id: 40, order: 1 },
			{ id: 10, order: 2 },
			{ id: 20, order: 3 },
		]);
	});

	it('breaks equal-order ties by ID and normalizes duplicate and zero positions', async () => {
		await db.update(socialLinks).set({ order: 0 });
		expect((await getSocialLinks()).map((link) => link.id)).toEqual([10, 20, 30, 40]);
		expect((await getPublicSocialLinks()).map((link) => link.id)).toEqual([10, 20, 30, 40]);
		await updateSocialLinkOrder(30, 1);

		expect(await readPositions()).toEqual([
			{ id: 30, order: 1 },
			{ id: 10, order: 2 },
			{ id: 20, order: 3 },
			{ id: 40, order: 4 },
		]);
	});

	it('leaves records and cache tags untouched for an unchanged position', async () => {
		const before = await getSocialLinks();
		expect(await updateSocialLinkOrder(30, 2)).toBe('');
		expect(await getSocialLinks()).toEqual(before);
		expect(mocks.updateTag).not.toHaveBeenCalled();
		expect(mocks.revalidatePath).not.toHaveBeenCalled();
	});

	it('redirects unauthenticated requests before starting a transaction', async () => {
		mocks.getServerSession.mockResolvedValue(null);
		const transaction = vi.spyOn(db, 'transaction');

		await expect(updateSocialLinkOrder(10, 2)).rejects.toThrow('redirect');
		expect(mocks.redirect).toHaveBeenCalledWith('/login');
		expect(transaction).not.toHaveBeenCalled();
	});

	it.each([
		[0, 1],
		[-1, 1],
		[1.5, 1],
		[NaN, 1],
		[Infinity, 1],
		[Number.MAX_SAFE_INTEGER + 1, 1],
		[10, 0],
		[10, -1],
		[10, 1.5],
		[10, NaN],
		[10, Infinity],
		[10, Number.MAX_SAFE_INTEGER + 1],
	])('rejects invalid move (%s, %s) before starting a transaction', async (id, position) => {
		const transaction = vi.spyOn(db, 'transaction');
		await expect(updateSocialLinkOrder(id, position)).rejects.toThrow('enteros positivos');
		expect(transaction).not.toHaveBeenCalled();
		expect(mocks.updateTag).not.toHaveBeenCalled();
	});

	it.each([
		{ id: 99, position: 1, error: 'No se encontró' },
		{ id: 10, position: 5, error: 'fuera de la lista' },
	])(
		'rejects move ($id, $position) without changing positions',
		async ({ id, position, error }) => {
			const before = await readPositions();
			await expect(updateSocialLinkOrder(id, position)).rejects.toThrow(error);
			expect(await readPositions()).toEqual(before);
			expect(mocks.updateTag).not.toHaveBeenCalled();
			expect(mocks.revalidatePath).not.toHaveBeenCalled();
		},
	);

	it('rolls back earlier writes when a later update fails', async () => {
		await db.run(
			sql.raw(`
			CREATE TRIGGER reject_order BEFORE UPDATE OF "order" ON social_links
			WHEN NEW.id = 10
			BEGIN
				SELECT RAISE(ABORT, 'save failed');
			END
		`),
		);
		const before = await getSocialLinks();

		await expect(updateSocialLinkOrder(10, 4)).rejects.toThrow();
		expect(await getSocialLinks()).toEqual(before);
		expect(mocks.updateTag).not.toHaveBeenCalled();
		expect(mocks.revalidatePath).not.toHaveBeenCalled();
	});

	it('preserves link details when positions change', async () => {
		const before = await getSocialLinks();
		await updateSocialLinkOrder(10, 4);
		const after = await getSocialLinks();
		for (const original of before) {
			expect(after.find((link) => link.id === original.id)).toMatchObject({
				name: original.name,
				url: original.url,
				icon: original.icon,
				color: original.color,
				createdAt: original.createdAt,
			});
		}
	});
});
