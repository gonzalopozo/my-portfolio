import { spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { nativeTool } from './native-tool.mjs';
import { mainWorkflow } from './ci-context.mjs';
import { commit, required } from './platform.mjs';

if (process.env.CIRCLECI !== 'true') throw new Error('CodeQL is a CircleCI security job.');
const tool = await nativeTool('codeql');
const database = resolve('.ci/codeql-database');
const report = '.ci/codeql/javascript.sarif';

function run(arguments_: string[], input?: string) {
	const result = spawnSync(tool.binary, arguments_, {
		stdio: input === undefined ? 'inherit' : ['pipe', 'inherit', 'inherit'],
		input,
	});
	if (result.status !== 0) throw new Error('CodeQL operation failed.');
}

try {
	await mkdir('.ci/codeql', { recursive: true });
	await rm(database, { recursive: true, force: true });
	run([
		'database',
		'create',
		database,
		'--language=javascript-typescript',
		'--build-mode=none',
		`--source-root=${process.cwd()}`,
		'--codescanning-config=.circleci/codeql-config.yml',
	]);
	run([
		'database',
		'analyze',
		database,
		'codeql/javascript-queries:codeql-suites/javascript-security-extended.qls',
		'--format=sarif-latest',
		`--output=${report}`,
		'--sarif-category=/language:javascript-typescript',
		'--threads=2',
		'--ram=6144',
	]);
	if (process.env.CODEQL_PUBLISH === 'true') {
		await mainWorkflow(['main-validation', 'manual-validation', 'codeql-scan']);
		run(
			[
				'github',
				'upload-results',
				`--repository=${required('GITHUB_REPOSITORY')}`,
				'--ref=refs/heads/main',
				`--commit=${commit(required('CIRCLE_SHA1'))}`,
				`--sarif=${report}`,
				'--github-auth-stdin',
			],
			required('GITHUB_TOKEN'),
		);
	}
	// Publish findings before applying the blocking severity gate.
	const gate = spawnSync('node', ['scripts/scan-codeql.mjs'], { stdio: 'inherit' });
	if (gate.status !== 0) throw new Error('CodeQL severity gate failed.');
} finally {
	await tool.close();
	await rm(database, { recursive: true, force: true });
}
