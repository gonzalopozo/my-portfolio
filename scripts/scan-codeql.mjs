import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Analyze's success means analysis completed. Findings need their own severity gate.
const directory = '.ci/codeql';
const files = (await readdir(directory, { recursive: true })).filter((name) =>
	name.endsWith('.sarif'),
);
if (!files.length) throw new Error('CodeQL did not produce a SARIF report.');
let blocking = 0;
for (const file of files) {
	const report = JSON.parse(await readFile(join(directory, file), 'utf8'));
	for (const run of report.runs ?? []) {
		const driverRules = run.tool?.driver?.rules ?? [];
		const rules = [
			...driverRules,
			...(run.tool?.extensions ?? []).flatMap((component) => component.rules ?? []),
		];
		for (const result of run.results ?? []) {
			const rule =
				driverRules[result.ruleIndex] ?? rules.find((rule) => rule.id === result.ruleId);
			if (!rule)
				throw new Error('CodeQL result lacks rule metadata; severity cannot be verified.');
			const score = Number(rule?.properties?.['security-severity'] ?? 0);
			if (!Number.isFinite(score)) throw new Error('Invalid CodeQL severity metadata.');
			const level = result.level ?? rule?.defaultConfiguration?.level ?? 'warning';
			if (score >= 7 || level === 'error') blocking++;
		}
	}
}
if (blocking)
	throw new Error(
		`CodeQL reported ${blocking} blocking security findings. Review them in GitHub Security.`,
	);
