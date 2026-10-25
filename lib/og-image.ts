import 'server-only';
import { isProjectImageUrl } from '@/lib/security/blob-ownership';
import { requireAdmin } from '@/lib/admin';
import { URL } from 'url';
import { resolve4, resolve6 } from 'dns/promises';
import * as cheerio from 'cheerio';
import { del, put } from '@/lib/blob';
import { getBlobPublicHostname } from '@/lib/blob-environment';
import { entityIdSchema } from '@/lib/schemas/common';
import { reportOgImageError } from '@/lib/og-image-errors';
import type {
	OgImageErrorCode,
	OgImageResult,
	OgImageStage,
	OgImageUploadResult,
} from '@/lib/og-image-feedback';

class OgImageOperationError extends Error {
	constructor(
		readonly code: OgImageErrorCode,
		readonly httpStatus?: number,
	) {
		super(code);
	}
}

/**
 * Retorna true/false dependiendo de si la dirección IP es invalida o valida respectivamente.
 * @param ip Dirección IP recibida
 * @returns Retorna true si es una IP invalida y false si es valida.
 */
function isInvalidIpV4(ip: string): boolean {
	const octets = ip.split('.').map(Number);
	if (octets.length !== 4 || octets.some((p) => isNaN(p))) return true;

	const [a, b, c] = octets;

	if (
		a === 0 ||
		a === 10 ||
		(a === 100 && b >= 64 && b <= 127) ||
		a === 127 ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 0 && c === 0) ||
		(a === 192 && b === 0 && c === 2) ||
		(a === 192 && b === 88 && c === 99) ||
		(a === 192 && b === 168) ||
		(a === 198 && b >= 18 && b <= 19) ||
		(a === 198 && b === 51 && c === 100) ||
		(a === 203 && b === 0 && c === 113) ||
		a >= 224
	)
		return true;

	return false;
}

function isInvalidIpV6(ip: string): boolean {
	if (ip.split('::').length > 2) return true;

	let ipFilled;

	if (ip.includes('::')) {
		const ipSplitParts = ip.split('::');

		const leftIpPart = ipSplitParts[0].split(':');
		const rightIpPart = ipSplitParts[1].split(':');

		const leftGroupsCount =
			leftIpPart.length === 1 && leftIpPart[0] === '' ? 0 : leftIpPart.length;
		const rightGroupsCount =
			rightIpPart.length === 1 && rightIpPart[0] === '' ? 0 : rightIpPart.length;

		const zeroGroupsToAdd = 8 - leftGroupsCount - rightGroupsCount;

		let zerosFiller = '';

		if (leftGroupsCount !== 0) zerosFiller += ':';
		for (let i = 0; i < zeroGroupsToAdd; i++) {
			zerosFiller += '0:';
		}
		if (rightGroupsCount === 0) zerosFiller = zerosFiller.slice(0, -1);

		ipFilled = ip.replaceAll('::', zerosFiller);
	} else ipFilled = ip;

	const groups = ipFilled.split(':').map((hexGroup) => parseInt(hexGroup, 16));
	if (groups.length !== 8 || groups.some((p) => isNaN(p))) return true;

	const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

	if (
		(g0 === 0 &&
			g1 === 0 &&
			g2 === 0 &&
			g3 === 0 &&
			g4 === 0 &&
			g5 === 0 &&
			g6 === 0 &&
			g7 >= 0 &&
			g7 <= 1) ||
		(g0 === 100 && g1 === 65435 && g2 === 1) ||
		(g0 === 256 && g1 === 0 && g2 === 0 && g3 === 0) ||
		(g0 === 8193 && g1 === 0) ||
		(g0 === 8193 && g1 === 2) ||
		(g0 === 8193 && g1 >= 16 && g1 <= 31) ||
		(g0 === 8193 && g1 === 3512) ||
		g0 === 8194 ||
		(g0 >= 64512 && g0 <= 65023) ||
		(g0 >= 65152 && g0 <= 65215) ||
		g0 >= 65280
	)
		return true;

	if (
		(g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 65535) ||
		(g0 === 100 && g1 === 65435 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0)
	) {
		const octet1 = g6 >> 8;
		const octet2 = g6 & 255;
		const octet3 = g7 >> 8;
		const octet4 = g7 & 255;

		const extractedIpV4 = `${octet1}.${octet2}.${octet3}.${octet4}`;

		if (isInvalidIpV4(extractedIpV4)) return true;
	}

	return false;
}

function isDnsMissingRecordsError(err: unknown): boolean {
	if (typeof err !== 'object' || err === null || !('code' in err)) return false;
	const code = (err as NodeJS.ErrnoException).code;
	return code === 'ENODATA' || code === 'ENOTFOUND' || code === 'ESOCKETNODATA';
}

/**
 * Resuelve A y AAAA; falla si el DNS falla de forma irrecuperable o si alguna IP es privada.
 * Hosts solo IPv4 o solo IPv6: el otro resolve puede rechazar con ENODATA/ENOTFOUND — es normal.
 */
async function assertHostnameHasOnlyPublicIps(hostname: string): Promise<void> {
	let v4: string[] = [];
	try {
		v4 = await resolve4(hostname);
	} catch (e) {
		if (!isDnsMissingRecordsError(e)) throw new OgImageOperationError('dns-failed');
	}

	for (const ip of v4) {
		if (isInvalidIpV4(ip)) throw new OgImageOperationError('blocked-url');
	}

	let v6: string[] = [];
	try {
		v6 = await resolve6(hostname);
	} catch (e) {
		if (!isDnsMissingRecordsError(e)) throw new OgImageOperationError('dns-failed');
	}

	for (const ip of v6) {
		if (isInvalidIpV6(ip)) throw new OgImageOperationError('blocked-url');
	}

	if (v4.length === 0 && v6.length === 0) throw new OgImageOperationError('dns-failed');
}

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

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

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

function isTimeout(error: unknown): boolean {
	return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

async function fetchSource(url: URL): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(url.toString(), {
			redirect: 'error',
			signal: AbortSignal.timeout(5_000),
		});
	} catch (error) {
		throw new OgImageOperationError(isTimeout(error) ? 'timeout' : 'request-failed');
	}
	if (!response.ok) {
		void response.body?.cancel().catch(() => {});
		throw new OgImageOperationError('http-failed', response.status);
	}
	return response;
}

/** Enforce the limit on bytes as they arrive, including responses without Content-Length. */
async function readLimitedBody(response: Response): Promise<Buffer> {
	const contentLength = Number(response.headers.get('content-length'));
	if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
		void response.body?.cancel().catch(() => {});
		throw new OgImageOperationError('too-large');
	}
	if (!response.body) return Buffer.alloc(0);
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_RESPONSE_BYTES) {
				void reader.cancel().catch(() => {});
				throw new OgImageOperationError('too-large');
			}
			chunks.push(value);
		}
		return Buffer.concat(chunks, size);
	} catch (error) {
		if (error instanceof OgImageOperationError) throw error;
		throw new OgImageOperationError(isTimeout(error) ? 'timeout' : 'request-failed');
	} finally {
		reader.releaseLock();
	}
}

function assertContentType(response: Response, allowed: readonly string[]): void {
	const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
	if (!contentType || !allowed.includes(contentType)) {
		void response.body?.cancel().catch(() => {});
		throw new OgImageOperationError('invalid-content-type');
	}
}

const imageFormats = [
	{ test: isPng, extension: 'png', contentType: 'image/png' },
	{ test: isJpeg, extension: 'jpeg', contentType: 'image/jpeg' },
	{ test: isWebP, extension: 'webp', contentType: 'image/webp' },
	{ test: isGif, extension: 'gif', contentType: 'image/gif' },
	{ test: isAvif, extension: 'avif', contentType: 'image/avif' },
];

/** Download and store an OG image, returning safe failure details for the administrator. */
export async function saveImageInVercelBlob(
	url: string,
	projectId: number,
): Promise<OgImageUploadResult> {
	await requireAdmin();
	let stage: OgImageStage = 'page-url';
	try {
		if (!entityIdSchema.safeParse(projectId).success) {
			throw new OgImageOperationError('invalid-project');
		}
		const webUrl = parseSourceUrl(url);
		stage = 'page-dns';
		await assertHostnameHasOnlyPublicIps(webUrl.hostname);
		stage = 'page-fetch';
		const response = await fetchSource(webUrl);
		assertContentType(response, ['text/html']);
		stage = 'page-body';
		const html = await readLimitedBody(response);
		stage = 'metadata';
		const page = cheerio.load(html.toString('utf8'));
		const meta =
			page('meta[property="og:image"]').length > 0
				? page('meta[property="og:image"]')
				: page('meta[name="og:image"]');
		const imageUrl = meta.attr('content')?.trim();
		if (!imageUrl) throw new OgImageOperationError('missing-image');
		stage = 'image-url';
		const normalizedImageUrl = parseSourceUrl(imageUrl, webUrl);
		stage = 'image-dns';
		await assertHostnameHasOnlyPublicIps(normalizedImageUrl.hostname);
		stage = 'image-fetch';
		const imageResponse = await fetchSource(normalizedImageUrl);
		assertContentType(imageResponse, [
			'image/png',
			'image/jpg',
			'image/jpeg',
			'image/webp',
			'image/gif',
			'image/avif',
		]);
		stage = 'image-body';
		const image = await readLimitedBody(imageResponse);
		const format = imageFormats.find(({ test }) => test(image));
		if (!format) throw new OgImageOperationError('invalid-image');
		stage = 'upload';
		let uploadedImage;
		try {
			uploadedImage = await put(
				`og-images/${projectId}-${Date.now()}.${format.extension}`,
				image,
				{
					access: 'public',
					contentType: format.contentType,
					cacheControlMaxAge: 31536000,
					// Concurrent attempts must not share a blob that a failed save might delete.
					addRandomSuffix: true,
				},
			);
		} catch {
			throw new OgImageOperationError('upload-failed');
		}
		return { ok: true, url: uploadedImage.url };
	} catch (error) {
		const code = error instanceof OgImageOperationError ? error.code : 'unexpected';
		const status = error instanceof OgImageOperationError ? error.httpStatus : undefined;
		return { ok: false, error: reportOgImageError(code, stage, projectId, status) };
	}
}

/** A cleanup failure must not hide the success of the project save or image refresh. */
export async function deleteOldImageInVercelBlob(
	oldImage: string,
	projectId?: number,
): Promise<OgImageResult> {
	await requireAdmin();
	if (!oldImage) return { ok: true };
	if (!isProjectImageUrl(oldImage, projectId, getBlobPublicHostname())) {
		return { ok: false, error: reportOgImageError('delete-failed', 'cleanup', projectId) };
	}
	try {
		await del(oldImage);
		return { ok: true };
	} catch {
		return { ok: false, error: reportOgImageError('delete-failed', 'cleanup', projectId) };
	}
}
