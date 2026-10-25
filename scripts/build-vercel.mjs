import { spawnSync } from 'node:child_process';
import { nativeTool } from './native-tool.mjs';

const tool = await nativeTool('pnpm');
try {
	const result = spawnSync(tool.binary, ['build'], { stdio: 'inherit' });
	if (result.status !== 0) throw new Error('Production build failed.');
} finally {
	await tool.close();
}
