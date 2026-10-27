import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm, chmod, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import manifest from '../tooling/binaries.json' with { type: 'json' };

/** Verified release archives; transient installation, never a download/build cache. */
export async function nativeTool(name) {
	if (process.platform !== 'linux' || process.arch !== 'x64')
		throw new Error('This bootstrap supports Linux x64 only.');
	if (name !== 'pnpm' && name !== 'gitleaks') throw new Error('Unsupported native tool.');
	const entry = manifest[name];
	if (
		!entry ||
		!/^[a-f0-9]{64}$/.test(entry.sha256) ||
		!/^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$/.test(entry.version)
	)
		throw new Error('Missing verified binary metadata.');
	const url =
		name === 'pnpm'
			? `https://github.com/pnpm/pnpm/releases/download/v${entry.version}/pnpm-linux-x64.tar.gz`
			: `https://github.com/gitleaks/gitleaks/releases/download/v${entry.version}/gitleaks_${entry.version}_linux_x64.tar.gz`;
	if (entry.url !== url) throw new Error('Unexpected tool release URL.');
	const signal = AbortSignal.timeout(120000);
	let response = await fetch(url, { redirect: 'manual', signal });
	if ([301, 302, 303, 307, 308].includes(response.status)) {
		const location = response.headers.get('location');
		if (!location) throw new Error('Missing tool release redirect.');
		const asset = new URL(location, url);
		if (
			(asset.origin !== 'https://release-assets.githubusercontent.com' &&
				asset.origin !== 'https://objects.githubusercontent.com') ||
			asset.username ||
			asset.password
		)
			throw new Error('Unexpected tool release redirect.');
		response = await fetch(asset, { redirect: 'error', signal });
	}
	if (!response.ok) throw new Error('Tool download failed.');
	const archive = Buffer.from(await response.arrayBuffer());
	if (createHash('sha256').update(archive).digest('hex') !== entry.sha256)
		throw new Error('Tool archive checksum mismatch.');
	const directory = await mkdtemp(join(tmpdir(), 'portfolio-tool-'));
	try {
		// Only checksum-verified bytes reach tar; no downloaded archive is saved to disk.
		const extraction = spawnSync(
			'tar',
			['-xzf', '-', '-C', directory, '--no-same-owner', '--no-same-permissions'],
			{ input: archive, stdio: ['pipe', 'inherit', 'inherit'] },
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
	} catch (error) {
		await rm(directory, { recursive: true, force: true });
		throw error;
	}
}
