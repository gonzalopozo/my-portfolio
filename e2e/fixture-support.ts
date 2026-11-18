import { createHash, randomUUID } from 'node:crypto';
import { rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface TestIdentity {
	testId: string;
	project: { name: string };
	repeatEachIndex: number;
	retry: number;
}

export function getTestNamespace(identity: TestIdentity): string {
	return createHash('sha256')
		.update(
			JSON.stringify([
				identity.project.name,
				identity.testId,
				identity.repeatEachIndex,
				identity.retry,
			]),
		)
		.digest('hex')
		.slice(0, 16);
}

/** Put uniqueness in the prefix because better-auth groups IPv6 clients by /64. */
export function getTestClientHeaders(identity: TestIdentity): Record<string, string> {
	const namespace = getTestNamespace(identity);
	return {
		'x-forwarded-for': `fd${namespace.slice(0, 2)}:${namespace.slice(2, 6)}:${namespace.slice(6, 10)}:${namespace.slice(10, 14)}::1`,
	};
}

/** Readers must see a complete scenario, including during resets and failed attempts. */
export async function writeFixtureScenario(
	filename: 'query.json' | 'music.txt',
	contents: string,
): Promise<void> {
	const directory = resolve(process.env.TEST_FIXTURE_DIRECTORY ?? '');
	if (
		process.env.APP_ENV !== 'test' ||
		process.env.PORTFOLIO_TEST_BUILD !== 'true' ||
		process.env.VERCEL ||
		!directory.startsWith(`${resolve('.ci')}/database-`) ||
		!['query.json', 'music.txt'].includes(filename)
	)
		throw new Error('Scenario writes require an owned production test fixture.');
	const temporary = resolve(directory, `.${filename}-${randomUUID()}.tmp`);
	try {
		await writeFile(temporary, contents, { flag: 'wx' });
		await rename(temporary, resolve(directory, filename));
	} finally {
		await rm(temporary, { force: true });
	}
}
