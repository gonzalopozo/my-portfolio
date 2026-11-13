import {
	mkdtemp,
	open,
	readFile,
	readdir,
	rename,
	rm,
	stat,
	utimes,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as FsPromises from 'node:fs/promises';
import { generateIconManifest } from '../../scripts/icon-manifest.mjs';

vi.mock('node:fs/promises', async (importOriginal) => {
	const actual = await importOriginal<typeof FsPromises>();
	return { ...actual, open: vi.fn(actual.open), rename: vi.fn(actual.rename) };
});

const actual = await vi.importActual<typeof FsPromises>('node:fs/promises');
const packs = ['fa', 'fa6', 'io5', 'di', 'ri', 'gr', 'si', 'bi', 'tb', 'lia'];
const loadPack = vi.fn(async () => ({ ExampleIcon: () => null }));
let directory: string;
let destination: string;

beforeEach(async () => {
	vi.mocked(open).mockReset().mockImplementation(actual.open);
	vi.mocked(rename).mockReset().mockImplementation(actual.rename);
	loadPack.mockReset().mockImplementation(async () => ({ ExampleIcon: () => null }));
	directory = await mkdtemp(join(tmpdir(), 'portfolio-icons-'));
	destination = join(directory, 'manifest.json');
});

afterEach(async () => {
	vi.restoreAllMocks();
	await rm(directory, { recursive: true, force: true });
});

describe('icon manifest generation', () => {
	it('creates a complete catalogue matching the installed supported packs', async () => {
		await generateIconManifest(destination);
		const manifest = JSON.parse(await readFile(destination, 'utf8')) as {
			name: string;
			pack: string;
		}[];

		expect([...new Set(manifest.map((icon) => icon.pack))]).toEqual(packs);
		for (const pack of packs) {
			const icons = await import(/* @vite-ignore */ `react-icons/${pack}`);
			const entries = manifest.filter((icon) => icon.pack === pack);
			expect(entries.length).toBeGreaterThan(0);
			expect(entries.map((icon) => icon.name)).toEqual(Object.keys(icons).sort());
			expect(
				entries.every((icon) => Object.keys(icon).sort().join(',') === 'name,pack'),
			).toBe(true);
		}
		expect(await readdir(directory)).toEqual(['manifest.json']);
	});

	it('sorts names consistently regardless of the order exports are loaded', async () => {
		await generateIconManifest(destination, async () => ({ Zebra: null, Alpha: null }));
		const original = await readFile(destination, 'utf8');
		const manifest = JSON.parse(original) as { name: string; pack: string }[];
		expect(manifest.slice(0, 2)).toEqual([
			{ name: 'Alpha', pack: 'fa' },
			{ name: 'Zebra', pack: 'fa' },
		]);

		await generateIconManifest(destination, async () => ({ Alpha: null, Zebra: null }));
		expect(await readFile(destination, 'utf8')).toBe(original);
	});

	it('replaces stale entries after installed pack exports change', async () => {
		await generateIconManifest(destination, async () => ({ RemovedIcon: null }));
		await generateIconManifest(destination, async () => ({ AddedIcon: null }));
		const manifest = JSON.parse(await readFile(destination, 'utf8')) as { name: string }[];
		expect(manifest).toHaveLength(packs.length);
		expect(manifest.every((icon) => icon.name === 'AddedIcon')).toBe(true);
		expect(await readdir(directory)).toEqual(['manifest.json']);
	});

	it('preserves the file and its modification time when unchanged', async () => {
		await generateIconManifest(destination, loadPack);
		const previousDate = new Date('2000-01-01T00:00:00Z');
		await utimes(destination, previousDate, previousDate);
		const before = await stat(destination);
		vi.mocked(open).mockClear();

		await generateIconManifest(destination, loadPack);

		expect((await stat(destination)).mtimeMs).toBe(before.mtimeMs);
		expect(open).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'preserves output when a pack import fails (existing: %s)',
		async (exists) => {
			if (exists) await writeFile(destination, 'previous catalogue');
			loadPack.mockResolvedValueOnce({ ExampleIcon: () => null });
			loadPack.mockRejectedValueOnce(new Error('Pack unavailable'));

			await expect(generateIconManifest(destination, loadPack)).rejects.toThrow(
				'Pack unavailable',
			);

			const contents = exists ? await readFile(destination, 'utf8') : undefined;
			expect(contents).toBe(exists ? 'previous catalogue' : undefined);
			expect(await readdir(directory)).toEqual(exists ? ['manifest.json'] : []);
		},
	);

	it('propagates read errors other than missing output', async () => {
		await expect(generateIconManifest(directory, loadPack)).rejects.toMatchObject({
			code: 'EISDIR',
		});
		expect(open).not.toHaveBeenCalled();
		expect(await readdir(directory)).toEqual([]);
	});

	it('cleans up a partial write without replacing the catalogue', async () => {
		await writeFile(destination, 'previous catalogue');
		vi.mocked(open).mockImplementationOnce(async (...arguments_) => {
			const handle = await actual.open(...arguments_);
			vi.spyOn(handle, 'writeFile').mockImplementationOnce(async () => {
				await handle.write('partial output');
				throw new Error('Disk full');
			});
			return handle;
		});

		await expect(generateIconManifest(destination, loadPack)).rejects.toThrow('Disk full');

		expect(await readFile(destination, 'utf8')).toBe('previous catalogue');
		expect(await readdir(directory)).toEqual(['manifest.json']);
	});

	it('preserves the catalogue and cleans up when atomic replacement fails', async () => {
		await writeFile(destination, 'previous catalogue');
		vi.mocked(rename).mockRejectedValueOnce(new Error('Rename failed'));

		await expect(generateIconManifest(destination, loadPack)).rejects.toThrow('Rename failed');

		expect(await readFile(destination, 'utf8')).toBe('previous catalogue');
		expect(await readdir(directory)).toEqual(['manifest.json']);
	});
});
