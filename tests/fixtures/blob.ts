import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { put, PutBlobResult } from '@vercel/blob';

function fixturePath(pathname: string) {
	// CI creates these files at runtime; they must never enter deployment tracing.
	const directory = resolve(/* turbopackIgnore: true */ process.env.TEST_FIXTURE_DIRECTORY ?? '');
	if (
		process.env.CI !== 'true' ||
		process.env.APP_ENV !== 'test' ||
		process.env.VERCEL ||
		!directory.startsWith(`${resolve('.ci')}/database-`) ||
		!/^(?:skill-icons|og-images)\/[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(pathname)
	)
		throw new Error('Unsafe Blob fixture operation.');
	const root = resolve(directory, 'blobs');
	const file = resolve(root, pathname);
	// Check the normalized path with a separator so sibling prefixes cannot match.
	if (!file.startsWith(`${root}${sep}`)) throw new Error('Unsafe Blob fixture operation.');
	return file;
}

export async function putFixture(
	pathname: string,
	body: Parameters<typeof put>[1],
	options: Parameters<typeof put>[2],
): Promise<PutBlobResult> {
	if (options.addRandomSuffix)
		pathname = pathname.replace(
			/\.[^.]+$/,
			(extension) => `-${randomUUID().replaceAll('-', '')}${extension}`,
		);
	const file = fixturePath(pathname);
	if (typeof body !== 'string' && !(body instanceof Uint8Array))
		throw new Error('Unsupported Blob fixture body.');
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, body);
	const url = `https://fixture.public.blob.vercel-storage.com/${pathname}`;
	return {
		url,
		downloadUrl: url,
		pathname,
		contentType: options.contentType ?? 'application/octet-stream',
		contentDisposition: 'inline',
		etag: 'synthetic-etag',
	};
}

export async function deleteFixture(input: string | string[]) {
	for (const value of Array.isArray(input) ? input : [input]) {
		const url = new URL(value);
		if (url.origin !== 'https://fixture.public.blob.vercel-storage.com')
			throw new Error('Unowned fixture Blob URL.');
		await rm(fixturePath(url.pathname.slice(1)), { force: true });
	}
}

export async function readFixture(url: URL) {
	try {
		const body = await readFile(fixturePath(url.pathname.slice(1)));
		return new Response(new Uint8Array(body), {
			headers: {
				'content-type': url.pathname.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
			},
		});
	} catch {
		return new Response(null, { status: 404 });
	}
}
