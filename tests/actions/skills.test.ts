// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	select: vi.fn(),
	delete: vi.fn(),
	uploadSkillIcon: vi.fn(),
	deleteSkillIcon: vi.fn(),
	updateTag: vi.fn(),
	redirect: vi.fn(),
}));

vi.mock('@/db', () => ({ db: mocks }));
vi.mock('@/lib/server-session', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('@/lib/skill-icons/storage', () => ({
	uploadSkillIcon: mocks.uploadSkillIcon,
	deleteSkillIcon: mocks.deleteSkillIcon,
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ updateTag: mocks.updateTag, revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));

import { createSkill, updateSkill, deleteSkill } from '@/lib/actions/skills';
import { PUBLIC_EXPERIENCES_CACHE_TAG, PUBLIC_PROJECTS_CACHE_TAG } from '@/lib/cache-tags';

function skillFormData(useColor: boolean, customColor?: string) {
	const formData = new FormData();
	formData.set('name', 'React');
	formData.set('type', 'frontend');
	formData.set('icon', 'SiReact|si');
	formData.set('url', '');
	if (useColor) formData.set('useColor', 'on');
	if (customColor) formData.set('customColor', customColor);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv('ADMIN_USER_IDS', 'admin');
	mocks.getServerSession.mockResolvedValue({ user: { id: 'admin' } });
	mocks.select.mockReturnValue({
		from: () => ({ where: async () => [{ customIconUrl: null }] }),
	});
	mocks.deleteSkillIcon.mockResolvedValue(undefined);
	mocks.redirect.mockImplementation(() => {
		throw new Error('redirect');
	});
});

describe('skill color persistence', () => {
	it('rejects an enabled color without a valid HEX before writing', async () => {
		const result = await createSkill({ error: null }, skillFormData(true, 'red'));
		expect(result.error).toMatch(/color/);
		expect(mocks.insert).not.toHaveBeenCalled();
	});

	it('saves the selected color and invalidates both public caches', async () => {
		const values = vi.fn().mockResolvedValue(undefined);
		mocks.insert.mockReturnValue({ values });

		await expect(createSkill({ error: null }, skillFormData(true, '#A1B2C3'))).rejects.toThrow(
			'redirect',
		);
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({ useColor: true, customColor: '#a1b2c3' }),
		);
		expect(mocks.updateTag).toHaveBeenCalledWith(PUBLIC_PROJECTS_CACHE_TAG);
		expect(mocks.updateTag).toHaveBeenCalledWith(PUBLIC_EXPERIENCES_CACHE_TAG);
	});

	it('disables color without replacing an existing saved HEX', async () => {
		const where = vi.fn().mockReturnValue({ returning: async () => [{ id: 7 }] });
		const set = vi.fn().mockReturnValue({ where });
		mocks.update.mockReturnValue({ set });

		await expect(updateSkill(7, { error: null }, skillFormData(false))).rejects.toThrow(
			'redirect',
		);
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ useColor: false, customColor: undefined }),
		);
	});
});

const oldIconUrl =
	'https://icons.public.blob.vercel-storage.com/skill-icons/11111111-1111-4111-8111-111111111111.svg';
const newIconUrl =
	'https://icons.public.blob.vercel-storage.com/skill-icons/22222222-2222-4222-8222-222222222222.svg';

function customForm(withFile = true) {
	const data = skillFormData(false);
	data.set('useCustomIcon', 'on');
	if (withFile)
		data.set('customIcon', new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' }));
	return data;
}

function existingIcon() {
	mocks.select.mockReturnValue({
		from: () => ({ where: async () => [{ customIconUrl: oldIconUrl }] }),
	});
}

function mockUpdate(result: { id: number }[] = [{ id: 7 }]) {
	const returning = vi.fn().mockResolvedValue(result);
	const set = vi.fn().mockReturnValue({ where: () => ({ returning }) });
	mocks.update.mockReturnValue({ set });
	return { set, returning };
}

describe('custom skill icon lifecycle', () => {
	it.each(['create', 'update', 'delete'])(
		'authenticates before %s touches storage or the database',
		async (operation) => {
			mocks.getServerSession.mockResolvedValue(null);
			const promise =
				operation === 'create'
					? createSkill({ error: null }, customForm())
					: operation === 'update'
						? updateSkill(7, { error: null }, customForm())
						: deleteSkill(7);
			await expect(promise).rejects.toThrow('redirect');
			expect(mocks.uploadSkillIcon).not.toHaveBeenCalled();
			expect(mocks.select).not.toHaveBeenCalled();
			expect(mocks.delete).not.toHaveBeenCalled();
		},
	);

	it('requires an upload for a new custom icon and ignores client-provided URLs', async () => {
		const data = customForm(false);
		data.set('customIconUrl', oldIconUrl);
		expect(await createSkill({ error: null }, data)).toMatchObject({
			error: expect.stringContaining('Selecciona'),
		});
		expect(mocks.insert).not.toHaveBeenCalled();
	});

	it('persists the Blob URL on creation without storing the transient switch', async () => {
		mocks.uploadSkillIcon.mockResolvedValue(newIconUrl);
		const values = vi.fn().mockResolvedValue(undefined);
		mocks.insert.mockReturnValue({ values });
		await expect(createSkill({ error: null }, customForm())).rejects.toThrow('redirect');
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({ customIconUrl: newIconUrl, icon: 'SiReact|si' }),
		);
		expect(values.mock.calls[0][0]).not.toHaveProperty('useCustomIcon');
		expect(mocks.deleteSkillIcon).not.toHaveBeenCalled();
	});

	it('stops a failed upload before inserting the skill', async () => {
		mocks.uploadSkillIcon.mockRejectedValue(new Error('Blob unavailable'));
		expect((await createSkill({ error: null }, customForm())).error).toContain('No se pudo');
		expect(mocks.insert).not.toHaveBeenCalled();
	});

	it('cleans up a new upload when creation fails', async () => {
		mocks.uploadSkillIcon.mockResolvedValue(newIconUrl);
		mocks.insert.mockReturnValue({
			values: async () => {
				throw new Error('Database unavailable');
			},
		});
		expect((await createSkill({ error: null }, customForm())).error).toContain('No se pudo');
		expect(mocks.deleteSkillIcon).toHaveBeenCalledWith(newIconUrl);
		expect(mocks.updateTag).not.toHaveBeenCalled();
	});

	it.each(['', 'blob'])(
		'keeps an existing icon when the empty file is named "%s"',
		async (filename) => {
			existingIcon();
			const { set } = mockUpdate();
			const data = customForm(false);
			data.set('customIcon', new File([], filename));
			data.set('customIconUrl', newIconUrl);
			await expect(updateSkill(7, { error: null }, data)).rejects.toThrow('redirect');
			expect(set).toHaveBeenCalledWith(
				expect.objectContaining({ customIconUrl: oldIconUrl }),
			);
			expect(mocks.uploadSkillIcon).not.toHaveBeenCalled();
			expect(mocks.deleteSkillIcon).not.toHaveBeenCalled();
		},
	);

	it('replaces an icon and deletes the previous blob after saving', async () => {
		existingIcon();
		mocks.uploadSkillIcon.mockResolvedValue(newIconUrl);
		const { set, returning } = mockUpdate();
		await expect(updateSkill(7, { error: null }, customForm())).rejects.toThrow('redirect');
		expect(set).toHaveBeenCalledWith(expect.objectContaining({ customIconUrl: newIconUrl }));
		expect(mocks.deleteSkillIcon).toHaveBeenCalledWith(oldIconUrl);
		expect(returning.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.deleteSkillIcon.mock.invocationCallOrder[0],
		);
	});

	it('deletes the stored icon when custom mode is disabled', async () => {
		existingIcon();
		const { set } = mockUpdate();
		await expect(updateSkill(7, { error: null }, skillFormData(false))).rejects.toThrow(
			'redirect',
		);
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({ customIconUrl: null, icon: 'SiReact|si' }),
		);
		expect(mocks.deleteSkillIcon).toHaveBeenCalledWith(oldIconUrl);
	});

	it('keeps the previous icon and cleans up the replacement when saving fails', async () => {
		existingIcon();
		mocks.uploadSkillIcon.mockResolvedValue(newIconUrl);
		const { returning } = mockUpdate();
		returning.mockRejectedValue(new Error('Database unavailable'));
		expect((await updateSkill(7, { error: null }, customForm())).error).toContain('No se pudo');
		expect(mocks.deleteSkillIcon).toHaveBeenCalledWith(newIconUrl);
		expect(mocks.deleteSkillIcon).not.toHaveBeenCalledWith(oldIconUrl);
	});

	it('cleans up an unused upload when another save changed or deleted the skill', async () => {
		existingIcon();
		mocks.uploadSkillIcon.mockResolvedValue(newIconUrl);
		mockUpdate([]);
		expect((await updateSkill(7, { error: null }, customForm())).error).toContain('Recarga');
		expect(mocks.deleteSkillIcon).toHaveBeenCalledWith(newIconUrl);
		expect(mocks.deleteSkillIcon).not.toHaveBeenCalledWith(oldIconUrl);
	});

	it('rejects a missing skill before uploading', async () => {
		mocks.select.mockReturnValue({ from: () => ({ where: async () => [] }) });
		expect((await updateSkill(7, { error: null }, customForm())).error).toContain(
			'ya no existe',
		);
		expect(mocks.uploadSkillIcon).not.toHaveBeenCalled();
	});

	it('deletes the URL returned by the deleted row', async () => {
		mocks.delete.mockReturnValue({
			where: () => ({ returning: async () => [{ customIconUrl: oldIconUrl }] }),
		});
		await deleteSkill(7);
		expect(mocks.deleteSkillIcon).toHaveBeenCalledWith(oldIconUrl);
		expect(mocks.updateTag).toHaveBeenCalledWith(PUBLIC_EXPERIENCES_CACHE_TAG);
	});
});

afterEach(() => vi.unstubAllEnvs());
