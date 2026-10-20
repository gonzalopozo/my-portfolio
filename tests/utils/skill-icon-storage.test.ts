// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	put: vi.fn(),
	del: vi.fn(),
	cacheLife: vi.fn(),
	requireAdmin: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@vercel/blob', () => ({ put: mocks.put, del: mocks.del }));
vi.mock('next/cache', () => ({ cacheLife: mocks.cacheLife, cacheTag: vi.fn() }));

import { uploadSkillIcon, loadSkillIcon, deleteSkillIcon } from '@/lib/skill-icons/storage';

const origin = 'https://icons.public.blob.vercel-storage.com';
const url = `${origin}/skill-icons/11111111-1111-4111-8111-111111111111.svg`;
const svg = '<svg viewBox="0 0 24 24"><path fill="red" d="M0 0h24v24z"/></svg>';
const fetchMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue(undefined);
	vi.stubEnv('BLOB_PUBLIC_HOSTNAME', origin);
	vi.stubGlobal('fetch', fetchMock);
	mocks.put.mockResolvedValue({ url });
	fetchMock.mockResolvedValue(
		new Response(svg, { headers: { 'content-type': 'image/svg+xml' } }),
	);
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('skill icon storage', () => {
	it('uploads only the normalized SVG using a unique managed pathname', async () => {
		expect(await uploadSkillIcon(new File([svg], 'logo.svg', { type: 'image/svg+xml' }))).toBe(
			url,
		);
		expect(mocks.put).toHaveBeenCalledWith(
			expect.stringMatching(/^skill-icons\/[\da-f-]{36}\.svg$/),
			expect.stringContaining('fill="currentColor"'),
			expect.objectContaining({
				access: 'public',
				contentType: 'image/svg+xml',
				addRandomSuffix: false,
			}),
		);
		expect(mocks.put.mock.calls[0][1]).not.toContain('red');
	});

	it.each([
		new File([svg], 'logo.png', { type: 'image/png' }),
		new File([svg], 'logo.svg', { type: 'text/html' }),
		new File([], 'logo.svg', { type: 'image/svg+xml' }),
		new File([' '.repeat(256 * 1024 + 1)], 'logo.svg', { type: 'image/svg+xml' }),
		new File(['<svg><script/></svg>'], 'logo.svg', { type: 'image/svg+xml' }),
	])('rejects invalid uploads before calling Blob: %s', async (file) => {
		await expect(uploadSkillIcon(file)).rejects.toThrow();
		expect(mocks.put).not.toHaveBeenCalled();
	});

	it.each([
		`<svg viewBox="0 0 24 24"><circle cx="0.${'0'.repeat(62)}1" r="1"/></svg>`,
		'<svg viewBox="0 0 24 24"><path d="M0 0" transform="translate(1) trailing"/></svg>',
		'<!-- unclosed <svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
	])('rejects invalid SVG content on upload and load: %s', async (source) => {
		await expect(
			uploadSkillIcon(new File([source], 'logo.svg', { type: 'image/svg+xml' })),
		).rejects.toThrow();
		expect(mocks.put).not.toHaveBeenCalled();
		fetchMock.mockResolvedValue(
			new Response(source, { headers: { 'content-type': 'image/svg+xml' } }),
		);
		expect(await loadSkillIcon(url)).toBeNull();
		expect(mocks.cacheLife).toHaveBeenCalledWith('seconds');
	});

	it('loads and validates a managed URL with bounded fetch settings', async () => {
		expect(await loadSkillIcon(url)).toMatchObject({
			tag: 'svg',
			attributes: { viewBox: '0 0 24 24' },
		});
		expect(fetchMock).toHaveBeenCalledWith(
			url,
			expect.objectContaining({ redirect: 'error', signal: expect.any(AbortSignal) }),
		);
	});

	it.each([
		`http://icons.public.blob.vercel-storage.com${new URL(url).pathname}`,
		`https://other.public.blob.vercel-storage.com${new URL(url).pathname}`,
		`${origin}/og-images/icon.svg`,
		`${url}?redirect=https://example.com`,
		`${url}#icon`,
		`https://user:password@icons.public.blob.vercel-storage.com${new URL(url).pathname}`,
		`${origin}/skill-icons/../og-images/icon.svg`,
	])('never fetches or deletes an unmanaged URL: %s', async (value) => {
		expect(await loadSkillIcon(value)).toBeNull();
		await deleteSkillIcon(value);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(mocks.del).not.toHaveBeenCalled();
	});

	it.each([
		() => new Response('missing', { status: 404 }),
		() => new Response(svg, { headers: { 'content-type': 'text/html' } }),
		() =>
			new Response(svg, {
				headers: {
					'content-type': 'image/svg+xml',
					'content-length': String(256 * 1024 + 1),
				},
			}),
		() =>
			new Response(' '.repeat(256 * 1024 + 1), {
				headers: { 'content-type': 'image/svg+xml' },
			}),
		() =>
			new Response('<svg><script/></svg>', { headers: { 'content-type': 'image/svg+xml' } }),
	])(
		'returns a fallback and shortens the cache for failed or unsafe responses',
		async (response) => {
			fetchMock.mockResolvedValue(response());
			expect(await loadSkillIcon(url)).toBeNull();
			expect(mocks.cacheLife).toHaveBeenCalledWith('seconds');
		},
	);

	it('recovers from network errors', async () => {
		fetchMock.mockRejectedValue(new Error('Network error'));
		expect(await loadSkillIcon(url)).toBeNull();
	});

	it('logs cleanup failures without failing a successful save', async () => {
		const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
		mocks.del.mockRejectedValue(new Error('Network error'));
		await expect(deleteSkillIcon(url)).resolves.toBeUndefined();
		expect(log).toHaveBeenCalledOnce();
		log.mockRestore();
	});
});

describe('skill icon write authorization', () => {
	it('rejects unauthorized uploads and deletions before calling Blob', async () => {
		mocks.requireAdmin.mockRejectedValue(new Error('Access denied.'));
		await expect(
			uploadSkillIcon(new File([svg], 'icon.svg', { type: 'image/svg+xml' })),
		).rejects.toThrow('Access denied.');
		await expect(deleteSkillIcon(url)).rejects.toThrow('Access denied.');
		expect(mocks.put).not.toHaveBeenCalled();
		expect(mocks.del).not.toHaveBeenCalled();
	});
});
