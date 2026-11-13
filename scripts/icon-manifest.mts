import { randomUUID } from 'node:crypto';
import { open, readFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const packIds = ['fa', 'fa6', 'io5', 'di', 'ri', 'gr', 'si', 'bi', 'tb', 'lia'];
const manifestPath = fileURLToPath(new URL('../lib/react-icons-manifest.json', import.meta.url));

interface Icon {
	name: string;
	pack: string;
}

type PackLoader = (packId: string) => Promise<Record<string, unknown>>;

// Let Node resolve installed package exports at runtime; Vite cannot expand these variable specifiers.

/**
 * Derive the catalogue from installed packs before publishing it atomically.
 * Keep unchanged output intact so preparation does not trigger development reloads.
 */
export async function generateIconManifest(
	destination = manifestPath,
	loadPack: PackLoader = (packId) => import(/* @vite-ignore */ `react-icons/${packId}`),
) {
	const output: Icon[] = [];

	for (const pack of packIds) {
		const icons = await loadPack(pack);
		for (const name of Object.keys(icons).sort()) output.push({ name, pack });
	}

	const content = JSON.stringify(output, null, 2);
	try {
		if ((await readFile(destination, 'utf8')) === content) return;
	} catch (error) {
		if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
	}

	// Exclusive creation and unique names keep concurrent generators' files separate.
	const temporary = `${destination}.${randomUUID()}.tmp`;
	const handle = await open(temporary, 'wx');
	try {
		try {
			await handle.writeFile(content, 'utf8');
		} finally {
			await handle.close();
		}
		await rename(temporary, destination);
	} finally {
		await rm(temporary, { force: true });
	}
}
