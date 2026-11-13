import 'server-only';
import * as cheerio from 'cheerio';
import sharp from 'sharp';
import { requireAdmin } from '@/lib/admin';
import { put } from '@/lib/blob';
import { entityIdSchema } from '@/lib/schemas/common';
import { reportOgImageError } from '@/lib/og-image-errors';
import type { OgImageStage, OgImageUploadResult } from '@/lib/og-image-feedback';
import { ImageBudget, OgImageOperationError } from '@/lib/og-image/budget';
import { downloadSource, resolvePublicAddresses } from '@/lib/og-image/network';
import { prepareImageUpload } from '@/lib/og-image/store';

function isPng(uInt8Array: Uint8Array): boolean {
	return (
		uInt8Array[0] === 0x89 &&
		uInt8Array[1] === 0x50 &&
		uInt8Array[2] === 0x4e &&
		uInt8Array[3] === 0x47
	);
}

function isJpeg(uInt8Array: Uint8Array): boolean {
	return uInt8Array[0] === 0xff && uInt8Array[1] === 0xd8 && uInt8Array[2] === 0xff;
}

function isWebP(uInt8Array: Uint8Array): boolean {
	return (
		uInt8Array[0] === 0x52 &&
		uInt8Array[1] === 0x49 &&
		uInt8Array[2] === 0x46 &&
		uInt8Array[3] === 0x46 &&
		uInt8Array[8] === 0x57 &&
		uInt8Array[9] === 0x45 &&
		uInt8Array[10] === 0x42 &&
		uInt8Array[11] === 0x50
	);
}

function isGif(uInt8Array: Uint8Array): boolean {
	return uInt8Array[0] === 0x47 && uInt8Array[1] === 0x49 && uInt8Array[2] === 0x46;
}

/** GIF decoders may silently accept a missing frame; require complete block boundaries. */
function assertCompleteGif(image: Buffer): void {
	const invalid = () => {
		throw new OgImageOperationError('invalid-image');
	};
	if (image.length < 14 || !['GIF87a', 'GIF89a'].includes(image.toString('ascii', 0, 6)))
		invalid();
	let offset = 13;
	if (image[10] & 0x80) offset += 3 * (1 << ((image[10] & 7) + 1));
	let frames = 0;
	const readBlocks = () => {
		while (offset < image.length) {
			const size = image[offset++];
			if (!size) return;
			offset += size;
			if (offset > image.length) invalid();
		}
		invalid();
	};
	while (offset < image.length) {
		const block = image[offset++];
		if (block === 0x3b) {
			if (!frames || offset !== image.length) invalid();
			return;
		}
		if (block === 0x21) {
			if (offset >= image.length) invalid();
			offset++; // Extension label; the remaining payload consists of sub-blocks.
			readBlocks();
		} else if (block === 0x2c) {
			if (offset + 9 > image.length) invalid();
			const packed = image[offset + 8];
			offset += 9;
			if (packed & 0x80) offset += 3 * (1 << ((packed & 7) + 1));
			if (offset >= image.length || image[offset] < 2 || image[offset] > 8) invalid();
			offset++; // Minimum code size precedes the image data blocks.
			readBlocks();
			frames++;
		} else invalid();
	}
	invalid();
}

/** ISO BMFF first box: `ftyp`; major or compatible brands must be `avif` or `avis`. */
const FOURCC_FTYP = [0x66, 0x74, 0x79, 0x70] as const;
const BRAND_AVIF = [0x61, 0x76, 0x69, 0x66] as const;
const BRAND_AVIS = [0x61, 0x76, 0x69, 0x73] as const;

function fourccEqual(buf: Uint8Array, offset: number, fourcc: readonly number[]): boolean {
	for (let i = 0; i < 4; i++) {
		if (buf[offset + i] !== fourcc[i]) return false;
	}
	return true;
}

function isAvifOrAvisBrand(buf: Uint8Array, offset: number): boolean {
	return fourccEqual(buf, offset, BRAND_AVIF) || fourccEqual(buf, offset, BRAND_AVIS);
}

function isAvif(uInt8Array: Uint8Array): boolean {
	if (uInt8Array.length < 16) return false;
	if (!fourccEqual(uInt8Array, 4, FOURCC_FTYP)) return false;

	const boxSize = new DataView(
		uInt8Array.buffer,
		uInt8Array.byteOffset,
		uInt8Array.byteLength,
	).getUint32(0, false);

	if (boxSize < 16 || boxSize > uInt8Array.length) return false;

	if (isAvifOrAvisBrand(uInt8Array, 8)) return true;

	for (let i = 16; i + 4 <= boxSize; i += 4) {
		if (isAvifOrAvisBrand(uInt8Array, i)) return true;
	}
	return false;
}

const imageFormats = [
	{ test: isPng, extension: 'png', contentType: 'image/png' },
	{ test: isJpeg, extension: 'jpeg', contentType: 'image/jpeg' },
	{ test: isWebP, extension: 'webp', contentType: 'image/webp' },
	{ test: isGif, extension: 'gif', contentType: 'image/gif' },
	{ test: isAvif, extension: 'avif', contentType: 'image/avif' },
];

function parseSourceUrl(value: string, base?: URL): URL {
	let url: URL;
	try {
		if (value.length > 2048) throw new Error('Invalid URL');
		url = new URL(value, base);
	} catch {
		throw new OgImageOperationError('invalid-url');
	}
	if (url.protocol !== 'https:' || url.username || url.password) {
		throw new OgImageOperationError('blocked-url');
	}
	return url;
}

/** Decode every frame to catch truncated payloads, but store the original bytes. */
export async function validateOgImage(image: Buffer, budget: ImageBudget) {
	const format = imageFormats.find(({ test }) => test(image));
	if (!format) throw new OgImageOperationError('invalid-image');
	if (format.extension === 'gif') assertCompleteGif(image);
	try {
		return await budget.run(3000, async (signal) => {
			const decoder = sharp(image, {
				animated: true,
				failOn: 'warning',
				limitInputPixels: 20_000_000,
			}).timeout({ seconds: 3 });
			const stop = () => decoder.destroy();
			signal.addEventListener('abort', stop, { once: true });
			try {
				const metadata = await decoder.metadata();
				const pixels =
					(metadata.width ?? 0) *
					(metadata.pageHeight ?? metadata.height ?? 0) *
					(metadata.pages ?? 1);
				if (pixels > 20_000_000) throw new OgImageOperationError('image-too-complex');
				if (!pixels) throw new OgImageOperationError('invalid-image');
				await decoder.raw().toBuffer();
				return format;
			} finally {
				signal.removeEventListener('abort', stop);
				decoder.destroy();
			}
		});
	} catch (error) {
		if (error instanceof OgImageOperationError) throw error;
		if (error instanceof Error && error.message.includes('pixel limit')) {
			throw new OgImageOperationError('image-too-complex');
		}
		if (error instanceof Error && error.message.includes('timeout'))
			throw new OgImageOperationError('timeout');
		throw new OgImageOperationError('invalid-image');
	}
}

/** Upload intent is durable before Blob is contacted, including ambiguous upload failures. */
export async function saveImageInVercelBlob(
	url: string,
	projectId: number,
	previousImage: string | null = null,
	budget = new ImageBudget(),
): Promise<OgImageUploadResult> {
	await requireAdmin();
	let stage: OgImageStage = 'page-url';
	let operationId: string | undefined;
	try {
		if (!entityIdSchema.safeParse(projectId).success) {
			throw new OgImageOperationError('invalid-project');
		}
		const webUrl = parseSourceUrl(url);
		stage = 'page-dns';
		const pageAddresses = await resolvePublicAddresses(webUrl, budget);
		stage = 'page-fetch';
		const html = await downloadSource(webUrl, pageAddresses, ['text/html'], budget, () => {
			stage = 'page-body';
		});
		stage = 'metadata';
		const page = cheerio.load(html.toString('utf8'));
		const meta = page('meta[property="og:image"]').length
			? page('meta[property="og:image"]')
			: page('meta[name="og:image"]');
		const imageUrl = meta.attr('content')?.trim();
		if (!imageUrl) throw new OgImageOperationError('missing-image');
		stage = 'image-url';
		const normalized = parseSourceUrl(imageUrl, webUrl);
		stage = 'image-dns';
		const imageAddresses = await resolvePublicAddresses(normalized, budget);
		stage = 'image-fetch';
		const image = await downloadSource(
			normalized,
			imageAddresses,
			imageFormats.map(({ contentType }) => contentType).concat('image/jpg'),
			budget,
			() => {
				stage = 'image-body';
			},
		);
		const format = await validateOgImage(image, budget);
		stage = 'persistence';
		const operation = await prepareImageUpload(
			projectId,
			format.extension,
			previousImage,
			budget,
		);
		operationId = operation.id;
		stage = 'upload';
		try {
			const uploaded = await budget.run(8000, (abortSignal) =>
				put(operation.pathname, image, {
					access: 'public',
					contentType: format.contentType,
					cacheControlMaxAge: 31536000,
					addRandomSuffix: false,
					allowOverwrite: false,
					abortSignal,
				}),
			);
			if (uploaded.url !== operation.candidateUrl)
				throw new OgImageOperationError('upload-failed');
		} catch (error) {
			if (error instanceof OgImageOperationError) throw error;
			throw new OgImageOperationError('upload-failed');
		}
		return { ok: true, url: operation.candidateUrl, operationId: operation.id };
	} catch (error) {
		return {
			ok: false,
			error: reportOgImageError(
				error instanceof OgImageOperationError ? error.code : 'unexpected',
				stage,
				projectId,
				error instanceof OgImageOperationError ? error.httpStatus : undefined,
				operationId,
			),
		};
	}
}
