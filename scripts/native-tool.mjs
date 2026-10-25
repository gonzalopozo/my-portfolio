import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile, chmod, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Verified release archives; transient installation, never a download/build cache. */
export async function nativeTool(name) {
	if (process.platform !== 'linux' || process.arch !== 'x64')
		throw new Error('This bootstrap supports Linux x64 only.');
	const manifest = JSON.parse(
		await readFile(new URL('../tooling/binaries.json', import.meta.url), 'utf8'),
	);
	const entry = manifest[name];
	if (!entry || !/^[a-f0-9]{64}$/.test(entry.sha256))
		throw new Error('Missing verified binary metadata.');
	const response = await fetch(entry.url, { signal: AbortSignal.timeout(120000) });
	if (!response.ok) throw new Error('Tool download failed.');
	const archive = Buffer.from(await response.arrayBuffer());
	if (createHash('sha256').update(archive).digest('hex') !== entry.sha256)
		throw new Error('Tool archive checksum mismatch.');
	const directory = await mkdtemp(join(tmpdir(), 'portfolio-tool-'));
	await writeFile(join(directory, 'archive.tar.gz'), archive);
	const extraction = spawnSync(
		'tar',
		['-xzf', join(directory, 'archive.tar.gz'), '-C', directory],
		{ stdio: 'inherit' },
	);
	if (extraction.status !== 0) throw new Error('Tool extraction failed.');
	const files = await readdir(directory, { recursive: true });
	let relative;
	for (const file of files)
		if (basename(file) === name && (await lstat(join(directory, file))).isFile()) {
			relative = file;
			break;
		}
	if (!relative) throw new Error('Tool executable missing from archive.');
	const binary = join(directory, relative);
	await chmod(binary, 0o700);
	return { binary, close: () => rm(directory, { recursive: true, force: true }) };
}
