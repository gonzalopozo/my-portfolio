import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

const mocks = vi.hoisted(() => ({
	admin: vi.fn(),
	resolve: vi.fn(),
	download: vi.fn(),
	put: vi.fn(),
	prepare: vi.fn(),
	cleanup: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/db', () => ({ db: { transaction: vi.fn() } }));
vi.mock('@/lib/admin', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/blob', () => ({ put: mocks.put }));
vi.mock('@/lib/og-image/network', () => ({
	resolvePublicAddresses: mocks.resolve,
	downloadSource: mocks.download,
}));
vi.mock('@/lib/og-image/store', () => ({
	prepareImageUpload: mocks.prepare,
	cleanupImageOperation: mocks.cleanup,
	recordImageCleanup: vi.fn(),
}));

import { saveImageInVercelBlob, validateOgImage } from '@/lib/og-image';
import { ImageBudget, OgImageOperationError } from '@/lib/og-image/budget';

const url = 'https://example.com/project';
const candidate = 'https://store.public.blob.vercel-storage.com/og-images/7-123-abc.png';
const operationId = '11111111-1111-4111-8111-111111111111';
const validPng = () =>
	sharp({ create: { width: 1, height: 1, channels: 4, background: 'red' } })
		.png()
		.toBuffer();

beforeEach(async () => {
	vi.resetAllMocks();
	mocks.resolve.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
	mocks.download
		.mockResolvedValueOnce(Buffer.from('<meta property="og:image" content="/image.png">'))
		.mockResolvedValueOnce(await validPng());
	mocks.prepare.mockResolvedValue({
		id: operationId,
		pathname: 'og-images/7-123-abc.png',
		candidateUrl: candidate,
	});
	mocks.put.mockResolvedValue({ url: candidate });
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('OG acquisition and durable uploads', () => {
	it('resolves the relative image independently and records intent before upload', async () => {
		expect(await saveImageInVercelBlob(url, 7)).toEqual({
			ok: true,
			url: candidate,
			operationId,
		});
		expect(mocks.resolve.mock.calls[1][0].href).toBe('https://example.com/image.png');
		expect(mocks.prepare.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.put.mock.invocationCallOrder[0],
		);
		expect(mocks.put).toHaveBeenCalledWith(
			'og-images/7-123-abc.png',
			expect.any(Buffer),
			expect.objectContaining({
				addRandomSuffix: false,
				allowOverwrite: false,
				abortSignal: expect.any(AbortSignal),
			}),
		);
	});
	it.each([
		['not a url', 'invalid-url'],
		['http://example.com', 'blocked-url'],
		['https://user:secret@example.com', 'blocked-url'],
	])('rejects %s before DNS', async (source, code) => {
		expect(await saveImageInVercelBlob(source, 7)).toMatchObject({
			ok: false,
			error: { code },
		});
		expect(mocks.resolve).not.toHaveBeenCalled();
	});
	it('rejects invalid project IDs before networking', async () => {
		expect(await saveImageInVercelBlob(url, -1)).toMatchObject({
			ok: false,
			error: { code: 'invalid-project' },
		});
		expect(mocks.resolve).not.toHaveBeenCalled();
	});
	it('preserves authorization redirects', async () => {
		mocks.admin.mockRejectedValueOnce(new Error('NEXT_REDIRECT'));
		await expect(saveImageInVercelBlob(url, 7)).rejects.toThrow('NEXT_REDIRECT');
		expect(mocks.download).not.toHaveBeenCalled();
	});
	it('reports missing metadata without upload intent', async () => {
		mocks.download.mockReset().mockResolvedValue(Buffer.from('<title>No image</title>'));
		expect(await saveImageInVercelBlob(url, 7)).toMatchObject({
			ok: false,
			error: { code: 'missing-image' },
		});
		expect(mocks.prepare).not.toHaveBeenCalled();
	});
	it('does not upload when recording upload intent fails', async () => {
		mocks.prepare.mockRejectedValueOnce(new OgImageOperationError('timeout'));
		expect(await saveImageInVercelBlob(url, 7)).toMatchObject({
			ok: false,
			error: { code: 'timeout', stage: 'persistence' },
		});
		expect(mocks.put).not.toHaveBeenCalled();
	});
	it('keeps uncertain uploads recorded and never deletes them in the catch', async () => {
		mocks.put.mockRejectedValueOnce(new Error('BLOB_READ_WRITE_TOKEN=secret'));
		const result = await saveImageInVercelBlob(url, 7);
		expect(result).toMatchObject({
			ok: false,
			error: { code: 'upload-failed', reference: operationId },
		});
		expect(mocks.cleanup).not.toHaveBeenCalled();
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
	});
	it('aborts a stalled upload', async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		mocks.put.mockImplementation((_path, _body, options) => {
			signal = options.abortSignal;
			return new Promise(() => {});
		});
		const pending = saveImageInVercelBlob(url, 7);
		// Let real native decoding finish before advancing the upload deadline.
		await vi.waitFor(() => expect(mocks.put).toHaveBeenCalled());
		await vi.advanceTimersByTimeAsync(8000);
		expect(await pending).toMatchObject({
			ok: false,
			error: { code: 'timeout', stage: 'upload' },
		});
		expect(signal?.aborted).toBe(true);
	});
});

describe('full image decoding', () => {
	it.each(['png', 'jpeg', 'webp', 'gif', 'avif'] as const)(
		'accepts a decodable %s',
		async (format) => {
			const image = await sharp({
				create: { width: 2, height: 2, channels: 4, background: 'red' },
			})
				.toFormat(format)
				.toBuffer();
			expect(await validateOgImage(image, new ImageBudget())).toMatchObject({
				extension: format,
			});
		},
	);
	it.each([
		Buffer.from([0x89, 0x50, 0x4e, 0x47]),
		Buffer.from('GIF'),
		Buffer.from([0xff, 0xd8, 0xff]),
	])('rejects header-only files', async (bytes) => {
		await expect(validateOgImage(bytes, new ImageBudget())).rejects.toMatchObject({
			code: 'invalid-image',
		});
	});
	it('rejects truncated PNG data beyond its signature', async () => {
		const bytes = await validPng();
		await expect(
			validateOgImage(bytes.subarray(0, 40), new ImageBudget()),
		).rejects.toMatchObject({ code: 'invalid-image' });
	});
	it('rejects corruption in a later animation frame', async () => {
		const raw = Buffer.alloc(2 * 4 * 3);
		raw.fill(Buffer.from([255, 0, 0]), 0, 12);
		raw.fill(Buffer.from([0, 0, 255]), 12);
		const image = await sharp(raw, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } })
			.gif({ delay: [100, 100] })
			.toBuffer();
		const secondFrame = image.lastIndexOf(0x2c);
		expect(secondFrame).toBeGreaterThan(image.indexOf(0x2c));
		await expect(
			validateOgImage(image.subarray(0, secondFrame + 10), new ImageBudget()),
		).rejects.toMatchObject({ code: 'invalid-image' });
	});
	it('bounds decoder metadata work as well as pixel processing', async () => {
		const image = await validPng();
		vi.spyOn(sharp.prototype, 'metadata').mockImplementationOnce(() => new Promise(() => {}));
		vi.useFakeTimers();
		const pending = validateOgImage(image, new ImageBudget());
		void pending.catch(() => {});
		await vi.advanceTimersByTimeAsync(3000);
		await expect(pending).rejects.toMatchObject({ code: 'timeout' });
	});
	it('rejects excessive decoded pixels before allocating raw output', async () => {
		const image = await sharp({
			create: { width: 5000, height: 4001, channels: 3, background: 'red' },
		})
			.png()
			.toBuffer();
		await expect(validateOgImage(image, new ImageBudget())).rejects.toMatchObject({
			code: 'image-too-complex',
		});
	});
});
