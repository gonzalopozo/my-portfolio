import { spawnSync } from 'node:child_process';
import vitestPackage from 'vitest/package.json' with { type: 'json' };
import coveragePackage from '@vitest/coverage-v8/package.json' with { type: 'json' };

if (vitestPackage.version !== coveragePackage.version) {
	throw new Error(
		`Vitest (${vitestPackage.version}) and @vitest/coverage-v8 (${coveragePackage.version}) must use the same installed version. Update both packages and the lockfile together.`,
	);
}

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
