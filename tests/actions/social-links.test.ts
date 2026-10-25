import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	updateTag: vi.fn(),
	redirect: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/db', () => ({ db: mocks }));
vi.mock('@/lib/server-session', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag, revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { createSocialLink, updateSocialLink } from '@/lib/actions/social-links';

function socialLinkFormData(color: string) {
	const formData = new FormData();
	formData.set('name', 'GitHub');
	formData.set('url', 'https://github.com/example');
	formData.set('icon', 'SiGithub | si');
	formData.set('color', color);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv('ADMIN_USER_IDS', 'admin');
	mocks.getServerSession.mockResolvedValue({ user: { id: 'admin' } });
	mocks.redirect.mockImplementation(() => {
		throw new Error('redirect');
	});
});

describe('social link color persistence', () => {
	it('rejects malformed colors before any database write', async () => {
		const result = await createSocialLink({ error: null }, socialLinkFormData('red'));
		expect(result.error).toMatch(/color válido/);
		expect(mocks.select).not.toHaveBeenCalled();
		expect(mocks.insert).not.toHaveBeenCalled();
	});

	it('saves the normalized color when creating a link', async () => {
		const values = vi.fn().mockResolvedValue(undefined);
		mocks.select.mockReturnValue({ from: vi.fn().mockResolvedValue([{ maxOrder: 2 }]) });
		mocks.insert.mockReturnValue({ values });

		await expect(
			createSocialLink({ error: null }, socialLinkFormData('#A1B2C3')),
		).rejects.toThrow('redirect');
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({ color: '#a1b2c3', order: 3 }),
		);
		expect(mocks.updateTag).toHaveBeenCalled();
	});

	it('saves the selected color when editing a link', async () => {
		const where = vi.fn().mockResolvedValue(undefined);
		const set = vi.fn().mockReturnValue({ where });
		mocks.update.mockReturnValue({ set });

		await expect(
			updateSocialLink(7, { error: null }, socialLinkFormData('#123ABC')),
		).rejects.toThrow('redirect');
		expect(set).toHaveBeenCalledWith(expect.objectContaining({ color: '#123abc' }));
		expect(where).toHaveBeenCalled();
	});
});

afterEach(() => vi.unstubAllEnvs());
