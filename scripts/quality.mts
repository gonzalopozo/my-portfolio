import { spawnSync } from 'node:child_process';

for (const command of ['format:check', 'lint', 'typecheck', 'spellcheck', 'knip']) {
	const result = spawnSync('pnpm', [command], { stdio: 'inherit' });
	if (result.status !== 0) throw new Error(`Quality check failed: ${command}`);
}
const result = spawnSync(
	'pnpm',
	[
		'exec',
		'depcruise',
		'app',
		'components',
		'lib',
		'db',
		'proxy.ts',
		'instrumentation.ts',
		'instrumentation-client.ts',
		'scripts',
		'--config',
		'.dependency-cruiser.cjs',
		'--output-type',
		'json',
	],
	{ encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
if (result.status !== 0) throw new Error('Architecture analysis failed.');
const report = JSON.parse(result.stdout) as { summary: { error: number; warn: number } };
if (report.summary.error || report.summary.warn) {
	process.stderr.write(result.stdout);
	throw new Error('Architecture errors and warnings block CI.');
}
