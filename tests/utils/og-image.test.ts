// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as CheerioModule from 'cheerio';

const mocks = vi.hoisted(() => ({
	admin: vi.fn(),
	resolve4: vi.fn(),
	resolve6: vi.fn(),
	fetch: vi.fn(),
	put: vi.fn(),
	del: vi.fn(),
	load: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }));
vi.mock('dns/promises', () => ({ resolve4: mocks.resolve4, resolve6: mocks.resolve6 }));
vi.mock('@vercel/blob', () => ({ put: mocks.put, del: mocks.del }));
vi.mock('cheerio', async (importOriginal) => {
	const actual = await importOriginal<typeof CheerioModule>();
	return { ...actual, load: mocks.load.mockImplementation(actual.load) };
});

import { deleteOldImageInVercelBlob, saveImageInVercelBlob } from '@/lib/og-image';

const sourceUrl = 'https://example.com/project';
const blobUrl = 'https://store.public.blob.vercel-storage.com/og-images/7-123-random.png';
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function page(html = '<meta property="og:image" content="/image.png">', headers = {}) {
	return new Response(html, { headers: { 'content-type': 'text/html', ...headers } });
}

function image() {
	return new Response(png, { headers: { 'content-type': 'image/png' } });
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv('APP_ENV', 'test');
	vi.stubEnv('VERCEL_ENV', undefined);
	vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'synthetic-storage-token');
	vi.stubEnv('BLOB_PUBLIC_HOSTNAME', 'https://store.public.blob.vercel-storage.com');
	mocks.admin.mockResolvedValue({ user: { id: 'admin' } });
	mocks.resolve4.mockResolvedValue(['93.184.216.34']);
	mocks.resolve6.mockRejectedValue({ code: 'ENODATA' });
	mocks.fetch.mockReset().mockResolvedValueOnce(page()).mockResolvedValueOnce(image());
	mocks.put.mockResolvedValue({ url: blobUrl });
	mocks.del.mockResolvedValue(undefined);
	vi.stubGlobal('fetch', mocks.fetch);
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe('OG image download outcomes', () => {
	it('uploads a relative OG image and preserves bounded fetch policies', async () => {
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toEqual({ ok: true, url: blobUrl });
		expect(mocks.fetch).toHaveBeenNthCalledWith(2, 'https://example.com/image.png', {
			redirect: 'error',
			signal: expect.any(AbortSignal),
		});
		expect(mocks.put).toHaveBeenCalledWith(
			expect.stringMatching(/og-images\/7-.*\.png$/),
			expect.any(Buffer),
			expect.objectContaining({ contentType: 'image/png', access: 'public' }),
		);
		expect(console.warn).not.toHaveBeenCalled();
		expect(console.error).not.toHaveBeenCalled();
	});

	it.each([
		['not a url', 'invalid-url'],
		['http://example.com', 'blocked-url'],
		['https://user:password@example.com', 'blocked-url'],
	])('rejects an unsafe source %s before networking', async (url, code) => {
		expect(await saveImageInVercelBlob(url, 7)).toMatchObject({
			ok: false,
			error: { code, stage: 'page-url' },
		});
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it('rejects an invalid project before networking', async () => {
		expect(await saveImageInVercelBlob(sourceUrl, -1)).toMatchObject({
			ok: false,
			error: { code: 'invalid-project' },
		});
		expect(mocks.resolve4).not.toHaveBeenCalled();
	});

	it('rejects a hostname with any private DNS address', async () => {
		mocks.resolve4.mockResolvedValue(['93.184.216.34', '127.0.0.1']);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'blocked-url', stage: 'page-dns' },
		});
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it('rejects a private image host independently of the page host', async () => {
		mocks.resolve4.mockResolvedValueOnce(['93.184.216.34']).mockResolvedValueOnce(['10.0.0.1']);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'blocked-url', stage: 'image-dns' },
		});
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
	});

	it('supports a public IPv6-only origin when A records are absent', async () => {
		mocks.resolve4.mockRejectedValue({ code: 'ENODATA' });
		mocks.resolve6.mockResolvedValue(['2606:4700:4700::1111']);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toEqual({ ok: true, url: blobUrl });
	});

	it.each(['no-records', 'resolver-failure'])('reports DNS failure for %s', async (scenario) => {
		mocks.resolve4.mockRejectedValue({
			code: scenario === 'no-records' ? 'ENOTFOUND' : 'ETIMEOUT',
		});
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'dns-failed', stage: 'page-dns' },
		});
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it.each(['page', 'image'])('reports %s timeouts without uploading', async (target) => {
		mocks.fetch.mockReset();
		if (target === 'image') mocks.fetch.mockResolvedValueOnce(page());
		mocks.fetch.mockRejectedValueOnce(new DOMException('secret URL', 'TimeoutError'));
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'timeout', stage: `${target}-fetch` },
		});
		expect(mocks.put).not.toHaveBeenCalled();
	});

	it('reports network or redirect rejection with a safe message code', async () => {
		mocks.fetch.mockReset().mockRejectedValueOnce(new TypeError('fetch failed: secret token'));
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'request-failed', stage: 'page-fetch' },
		});
	});

	it.each(['page', 'image'])(
		'logs only the HTTP status for a failed %s response',
		async (target) => {
			mocks.fetch.mockReset();
			if (target === 'image') mocks.fetch.mockResolvedValueOnce(page());
			mocks.fetch.mockResolvedValueOnce(new Response('secret body', { status: 503 }));
			expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
				ok: false,
				error: { code: 'http-failed', stage: `${target}-fetch` },
			});
			expect(console.warn).toHaveBeenCalledOnce();
			expect(JSON.parse(vi.mocked(console.warn).mock.calls[0][0])).toMatchObject({
				operation: `project_image.${target}-fetch`,
				classification: 'http-failed',
				status: 503,
			});
			expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain('secret body');
		},
	);

	it.each(['page', 'image'])('rejects an unsupported %s content type', async (target) => {
		mocks.fetch.mockReset();
		if (target === 'image') mocks.fetch.mockResolvedValueOnce(page());
		mocks.fetch.mockResolvedValueOnce(
			new Response('content', { headers: { 'content-type': 'text/plain' } }),
		);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'invalid-content-type' },
		});
	});

	it('rejects the advertised size before reading the body', async () => {
		mocks.fetch
			.mockReset()
			.mockResolvedValueOnce(page('', { 'content-length': String(5 * 1024 * 1024 + 1) }));
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'too-large', stage: 'page-body' },
		});
	});

	it('allows an image exactly at the size limit', async () => {
		const bytes = new Uint8Array(5 * 1024 * 1024);
		bytes.set(png);
		mocks.fetch
			.mockReset()
			.mockResolvedValueOnce(page())
			.mockResolvedValueOnce(
				new Response(bytes, { headers: { 'content-type': 'image/png' } }),
			);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toEqual({ ok: true, url: blobUrl });
	});

	it.each(['page', 'image'])(
		'cancels an oversized streamed %s without a Content-Length',
		async (target) => {
			const cancel = vi.fn();
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 1));
				},
				cancel,
			});
			mocks.fetch.mockReset();
			if (target === 'image') mocks.fetch.mockResolvedValueOnce(page());
			mocks.fetch.mockResolvedValueOnce(
				new Response(body, {
					headers: { 'content-type': target === 'page' ? 'text/html' : 'image/png' },
				}),
			);
			expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
				ok: false,
				error: { code: 'too-large', stage: `${target}-body` },
			});
			expect(cancel).toHaveBeenCalled();
			expect(mocks.put).not.toHaveBeenCalled();
		},
	);

	it.each(['page', 'image'])('handles a rejected %s body read', async (target) => {
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(new Error('secret upstream body error'));
			},
		});
		mocks.fetch.mockReset();
		if (target === 'image') mocks.fetch.mockResolvedValueOnce(page());
		mocks.fetch.mockResolvedValueOnce(
			new Response(body, {
				headers: { 'content-type': target === 'page' ? 'text/html' : 'image/png' },
			}),
		);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'request-failed', stage: `${target}-body` },
		});
	});

	it('classifies a timeout during a response body read', async () => {
		const body = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.error(new DOMException('secret URL', 'TimeoutError'));
			},
		});
		mocks.fetch.mockReset().mockResolvedValueOnce(
			new Response(body, {
				headers: { 'content-type': 'text/html' },
			}),
		);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'timeout', stage: 'page-body' },
		});
	});

	it.each(['<title>No metadata</title>', '<meta property="og:image" content=" ">'])(
		'reports missing OG metadata',
		async (html) => {
			mocks.fetch.mockReset().mockResolvedValueOnce(page(html));
			expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
				ok: false,
				error: { code: 'missing-image', stage: 'metadata' },
			});
		},
	);

	it.each([
		['https://[invalid', 'invalid-url'],
		['http://example.com/image.png', 'blocked-url'],
	])('handles invalid OG image addresses', async (url, code) => {
		mocks.fetch
			.mockReset()
			.mockResolvedValueOnce(page(`<meta property="og:image" content="${url}">`));
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code, stage: 'image-url' },
		});
	});

	it('rejects image bytes that do not match a supported format', async () => {
		mocks.fetch
			.mockReset()
			.mockResolvedValueOnce(page())
			.mockResolvedValueOnce(
				new Response('not an image', { headers: { 'content-type': 'image/png' } }),
			);
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'invalid-image', stage: 'image-body' },
		});
		expect(mocks.put).not.toHaveBeenCalled();
	});

	it('handles unexpected parsing failures', async () => {
		mocks.load.mockImplementationOnce(() => {
			throw new Error('secret parser error');
		});
		expect(await saveImageInVercelBlob(sourceUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'unexpected', stage: 'metadata' },
		});
	});

	it('correlates upload failures without logging the exception or sensitive URL', async () => {
		mocks.put.mockRejectedValueOnce(new Error('BLOB_READ_WRITE_TOKEN=secret'));
		const result = await saveImageInVercelBlob(`${sourceUrl}?token=secret`, 7);
		expect(result).toMatchObject({
			ok: false,
			error: { code: 'upload-failed', stage: 'upload' },
		});
		if (result.ok) throw new Error('Expected failure');
		expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toMatchObject({
			classification: 'upload-failed',
			reference: result.error.reference,
			operation: 'project_image.upload',
		});
		expect(JSON.stringify(result)).not.toContain('secret');
	});
});

describe('OG image cleanup and authorization', () => {
	it('rejects production cleanup and uses Preview credentials for owned Preview images', async () => {
		const previewOrigin = 'https://preview.public.blob.vercel-storage.com';
		const previewUrl = `${previewOrigin}/og-images/7-123-random.png`;
		vi.stubEnv('VERCEL_ENV', 'preview');
		vi.stubEnv('BLOB_PREVIEW_PUBLIC_HOSTNAME', previewOrigin);
		vi.stubEnv('BLOB_PREVIEW_READ_WRITE_TOKEN', 'synthetic-preview-token');

		expect(await deleteOldImageInVercelBlob(blobUrl, 7)).toMatchObject({ ok: false });
		expect(mocks.del).not.toHaveBeenCalled();
		expect(await deleteOldImageInVercelBlob(previewUrl, 7)).toEqual({ ok: true });
		expect(mocks.del).toHaveBeenCalledWith(previewUrl, { token: 'synthetic-preview-token' });
	});

	it('returns cleanup failure with a diagnostic reference', async () => {
		mocks.del.mockRejectedValueOnce(new Error('storage token secret'));
		expect(await deleteOldImageInVercelBlob(blobUrl, 7)).toMatchObject({
			ok: false,
			error: { code: 'delete-failed', stage: 'cleanup', reference: expect.any(String) },
		});
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
	});

	it('skips empty cleanup requests', async () => {
		expect(await deleteOldImageInVercelBlob('', 7)).toEqual({ ok: true });
		expect(mocks.del).not.toHaveBeenCalled();
	});

	it('propagates authorization failures before networking or storage', async () => {
		mocks.admin.mockRejectedValue(new Error('NEXT_REDIRECT'));
		await expect(saveImageInVercelBlob(sourceUrl, 7)).rejects.toThrow('NEXT_REDIRECT');
		await expect(deleteOldImageInVercelBlob(blobUrl, 7)).rejects.toThrow('NEXT_REDIRECT');
		expect(mocks.fetch).not.toHaveBeenCalled();
		expect(mocks.del).not.toHaveBeenCalled();
		expect(console.error).not.toHaveBeenCalled();
	});
});
