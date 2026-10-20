import 'server-only';
import { logOperation } from '@/lib/observability/logger';
import { requireAdmin } from '@/lib/admin';
import { randomUUID } from 'node:crypto';
import { del, put } from '@/lib/blob';
import { cacheLife, cacheTag } from 'next/cache';
import { getSkillIconFileError, MAX_SKILL_ICON_BYTES } from '@/lib/schemas/skill-icon';
import {
	normalizeSkillIconSvg,
	serializeSkillIconSvg,
	SkillIconValidationError,
} from '@/lib/skill-icons/svg';

/** Restrict reads and deletes to this store's managed skill icon objects. */
function isSkillIconUrl(value: string): boolean {
	try {
		const configured = new URL(process.env.BLOB_PUBLIC_HOSTNAME ?? '');
		const url = new URL(value);
		return (
			configured.protocol === 'https:' &&
			configured.hostname.endsWith('.public.blob.vercel-storage.com') &&
			url.origin === configured.origin &&
			!url.username &&
			!url.password &&
			!url.search &&
			!url.hash &&
			/^\/skill-icons\/[\da-f-]{36}\.svg$/.test(url.pathname)
		);
	} catch {
		return false;
	}
}

export async function uploadSkillIcon(file: File): Promise<string> {
	await requireAdmin();
	const error = getSkillIconFileError(file);
	if (error) throw new SkillIconValidationError(error);
	const source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
	const svg = serializeSkillIconSvg(normalizeSkillIconSvg(source));
	if (Buffer.byteLength(svg, 'utf8') > MAX_SKILL_ICON_BYTES)
		throw new SkillIconValidationError(
			'El SVG normalizado supera los 256 KiB. Simplifica sus trazados.',
		);
	const blob = await put(`skill-icons/${randomUUID()}.svg`, svg, {
		access: 'public',
		contentType: 'image/svg+xml',
		addRandomSuffix: false,
		cacheControlMaxAge: 31536000,
	});
	return blob.url;
}

export async function deleteSkillIcon(url: string | null): Promise<void> {
	await requireAdmin();
	if (!url || !isSkillIconUrl(url)) return;
	try {
		await del(url);
	} catch {
		logOperation('warn', {
			operation: 'skill_icon.delete',
			classification: 'blob_cleanup_failed',
		});
	}
}

async function readSvgResponse(response: Response): Promise<string> {
	if (
		!response.ok ||
		response.headers.get('content-type')?.split(';')[0].trim() !== 'image/svg+xml' ||
		Number(response.headers.get('content-length')) > MAX_SKILL_ICON_BYTES ||
		!response.body
	)
		throw new SkillIconValidationError();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_SKILL_ICON_BYTES) throw new SkillIconValidationError();
			chunks.push(value);
		}
	} finally {
		await reader.cancel();
	}
	return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
}

/** Immutable URLs share one cached, validated tree across all icon placements. */
export async function loadSkillIcon(url: string) {
	'use cache';
	cacheLife('max');
	cacheTag('dynamic-icons');
	if (!isSkillIconUrl(url)) return null;
	try {
		const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
		return normalizeSkillIconSvg(await readSvgResponse(response));
	} catch {
		// Retry temporary Blob failures without permanently caching a missing icon.
		cacheLife('seconds');
		return null;
	}
}
