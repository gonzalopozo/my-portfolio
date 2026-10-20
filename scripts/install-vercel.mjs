import { spawnSync } from 'node:child_process';
import { nativeTool } from './native-tool.mjs';

const tool = await nativeTool('pnpm');
try {
	const result = spawnSync(tool.binary, ['install', '--frozen-lockfile', '--ignore-scripts'], {
		stdio: 'inherit',
	});
	if (result.status !== 0) throw new Error('Frozen installation failed.');
} finally {
	await tool.close();
}
