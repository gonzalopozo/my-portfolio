import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFixture, putFixture, readFixture } from '../fixtures/blob';

const origin = 'https://fixture.public.blob.vercel-storage.com';
const options = { access: 'public', addRandomSuffix: false } as const;
let directory: string;

beforeEach(async () => {
	await mkdir('.ci', { recursive: true });
	directory = await mkdtemp(resolve('.ci/database-'));
	vi.stubEnv('CI', 'true');
	vi.stubEnv('APP_ENV', 'test');
	vi.stubEnv('VERCEL', undefined);
	vi.stubEnv('TEST_FIXTURE_DIRECTORY', directory);
});

afterEach(async () => {
	vi.unstubAllEnvs();
	await rm(directory, { recursive: true, force: true });
});

describe('Blob fixture path boundaries', () => {
	it.each(['skill-icons/icon.svg', 'og-images/7-123.png'])(
		'writes, reads and deletes %s inside the fixture store',
		async (pathname) => {
			const result = await putFixture(pathname, 'synthetic image', options);
			expect(result.url).toBe(`${origin}/${pathname}`);
			expect(await readFile(resolve(directory, 'blobs', pathname), 'utf8')).toBe(
				'synthetic image',
			);
			const response = await readFixture(new URL(result.url));
			expect(await response.text()).toBe('synthetic image');
			await deleteFixture(result.url);
			expect((await readFixture(new URL(result.url))).status).toBe(404);
		},
	);

	it('keeps generated suffixes inside the managed path', async () => {
		const result = await putFixture('og-images/7-123.png', Buffer.from([1, 2, 3]), {
			...options,
			addRandomSuffix: true,
		});
		expect(result.pathname).toMatch(/^og-images\/7-123-[a-f0-9]{32}\.png$/);
		const response = await readFixture(new URL(result.url));
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
	});

	it.each([
		'../outside.png',
		'og-images/../../outside.png',
		'og-images/../outside.png',
		'og-images/..',
		'og-images/.',
		'og-images/nested/image.png',
		'og-images\\outside.png',
		'/og-images/7-123.png',
		'other/7-123.png',
	])('rejects an unmanaged upload path: %s', async (pathname) => {
		await expect(putFixture(pathname, 'synthetic image', options)).rejects.toThrow(
			'Unsafe Blob fixture operation.',
		);
	});

	it('rejects reads and deletions outside the fixture store', async () => {
		const url = new URL(`${origin}/og-images/../outside.png`);
		await expect(deleteFixture(url.href)).rejects.toThrow('Unsafe Blob fixture operation.');
		expect((await readFixture(url)).status).toBe(404);
	});

	it.each([
		['CI', 'false'],
		['APP_ENV', 'production'],
		['VERCEL', '1'],
		['TEST_FIXTURE_DIRECTORY', undefined],
		['TEST_FIXTURE_DIRECTORY', resolve('.ci/other')],
	] as const)('requires an isolated test environment: %s=%s', async (name, value) => {
		vi.stubEnv(name, value);
		await expect(putFixture('og-images/7-123.png', 'synthetic image', options)).rejects.toThrow(
			'Unsafe Blob fixture operation.',
		);
	});
});
