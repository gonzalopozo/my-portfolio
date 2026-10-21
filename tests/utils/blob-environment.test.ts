import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ put: vi.fn(), del: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@vercel/blob', () => ({ put: mocks.put, del: mocks.del }));

import { getBlobPublicHostname } from '@/lib/blob-environment';
import { del, put } from '@/lib/blob';

const productionOrigin = 'https://production.public.blob.vercel-storage.com';
const previewOrigin = 'https://preview.public.blob.vercel-storage.com';
const productionToken = 'synthetic-production-token';
const previewToken = 'synthetic-preview-token';

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubEnv('CI', 'false');
	vi.stubEnv('VERCEL_ENV', undefined);
	vi.stubEnv('APP_ENV', 'development');
	vi.stubEnv('BLOB_PUBLIC_HOSTNAME', productionOrigin);
	vi.stubEnv('BLOB_READ_WRITE_TOKEN', productionToken);
	vi.stubEnv('BLOB_PREVIEW_PUBLIC_HOSTNAME', previewOrigin);
	vi.stubEnv('BLOB_PREVIEW_READ_WRITE_TOKEN', previewToken);
	mocks.put.mockResolvedValue({ url: `${previewOrigin}/image.svg` });
	mocks.del.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllEnvs());

describe('Blob environment isolation', () => {
	it.each([
		{ deployment: 'preview', application: 'production', preview: true },
		{ deployment: 'preview', application: 'test', preview: true },
		{ deployment: 'production', application: 'preview', preview: false },
		{ deployment: undefined, application: 'preview', preview: true },
		{ deployment: undefined, application: 'development', preview: false },
		{ deployment: undefined, application: 'test', preview: false },
	])('selects one store for $deployment deployments and APP_ENV=$application', async (entry) => {
		vi.stubEnv('VERCEL_ENV', entry.deployment);
		vi.stubEnv('APP_ENV', entry.application);
		const origin = entry.preview ? previewOrigin : productionOrigin;
		const token = entry.preview ? previewToken : productionToken;

		expect(getBlobPublicHostname()).toBe(origin);
		await put('image.svg', '<svg/>', { access: 'public' });
		await del(`${origin}/image.svg`);
		expect(mocks.put).toHaveBeenCalledWith('image.svg', '<svg/>', {
			access: 'public',
			token,
		});
		expect(mocks.del).toHaveBeenCalledWith(`${origin}/image.svg`, { token });
	});

	it('does not borrow the production hostname when the Preview hostname is missing', () => {
		vi.stubEnv('VERCEL_ENV', 'preview');
		vi.stubEnv('BLOB_PREVIEW_PUBLIC_HOSTNAME', undefined);
		expect(getBlobPublicHostname()).toBeUndefined();
	});

	it.each([undefined, ''])('blocks storage when the Preview token is %s', async (token) => {
		vi.stubEnv('VERCEL_ENV', 'preview');
		vi.stubEnv('BLOB_PREVIEW_READ_WRITE_TOKEN', token);
		await expect(put('image.svg', '<svg/>', { access: 'public' })).rejects.toThrow(
			'BLOB_PREVIEW_READ_WRITE_TOKEN is required',
		);
		await expect(del(`${previewOrigin}/image.svg`)).rejects.toThrow(
			'BLOB_PREVIEW_READ_WRITE_TOKEN is required',
		);
		expect(mocks.put).not.toHaveBeenCalled();
		expect(mocks.del).not.toHaveBeenCalled();
	});

	it('does not borrow Preview credentials when the production token is missing', async () => {
		vi.stubEnv('VERCEL_ENV', 'production');
		vi.stubEnv('BLOB_READ_WRITE_TOKEN', undefined);
		await expect(put('image.svg', '<svg/>', { access: 'public' })).rejects.toThrow(
			'BLOB_READ_WRITE_TOKEN is required',
		);
		expect(mocks.put).not.toHaveBeenCalled();
	});

	it('keeps Preview on its own store even if a caller supplies another token', async () => {
		vi.stubEnv('VERCEL_ENV', 'preview');
		await put('image.svg', '<svg/>', { access: 'public', token: productionToken });
		await del(`${previewOrigin}/image.svg`, { token: productionToken });
		expect(mocks.put).toHaveBeenCalledWith('image.svg', '<svg/>', {
			access: 'public',
			token: previewToken,
		});
		expect(mocks.del).toHaveBeenCalledWith(`${previewOrigin}/image.svg`, {
			token: previewToken,
		});
	});
});
