import { spawnSync } from 'node:child_process';
import { nativeTool } from './native-tool.mjs';

const base = process.env.SCAN_BASE;
const head = process.env.SCAN_HEAD;
if ((base || head) && (!/^[a-f0-9]{40}$/.test(base ?? '') || !/^[a-f0-9]{40}$/.test(head ?? '')))
	throw new Error('Invalid scan range.');
const tool = await nativeTool('gitleaks');
try {
	const range = base && head ? `${base}..${head}` : '--all';
	// Exclude legacy history before collection; never inspect .specstory content.
	const result = spawnSync(
		tool.binary,
		['git', '--redact=100', '--no-banner', `--log-opts=${range} -- . :(exclude).specstory`],
		{ stdio: 'inherit' },
	);
	if (result.status !== 0)
		throw new Error('Secret scan failed. Rotate any exposed credential before remediation.');
} finally {
	await tool.close();
}
