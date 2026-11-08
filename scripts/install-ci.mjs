import { appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { nativeTool } from './native-tool.mjs';

if (process.env.CIRCLECI !== 'true' || !process.env.BASH_ENV)
	throw new Error('Use the pnpm bootstrap inside a CircleCI job.');

// Each job gets a transient checksum-verified pnpm installation, with no restore cache.
const tool = await nativeTool('pnpm');
try {
	const result = spawnSync(tool.binary, ['install', '--frozen-lockfile', '--ignore-scripts'], {
		stdio: 'inherit',
	});
	if (result.status !== 0) throw new Error('Frozen installation failed.');
	if (!process.env.BASH_ENV) throw new Error('Missing CircleCI shell environment path.');
	const directory = dirname(tool.binary).replaceAll("'", "'\\''");
	await appendFile(process.env.BASH_ENV, `export PATH='${directory}':"$PATH"\n`);
} catch (error) {
	await tool.close();
	throw error;
}
