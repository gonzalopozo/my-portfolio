import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** A filesystem-owned fixture changes latency/failures without a production test endpoint. */
export async function beforeQuery(operation: string) {
	// The harness creates these files at runtime; keep them outside deployment tracing.
	const directory = resolve(/* turbopackIgnore: true */ process.env.TEST_FIXTURE_DIRECTORY ?? '');
	if (
		process.env.PORTFOLIO_TEST_BUILD !== 'true' ||
		process.env.APP_ENV !== 'test' ||
		process.env.VERCEL ||
		!directory.startsWith(`${resolve('.ci')}/database-`)
	)
		throw new Error('Query fixtures require an isolated database.');
	const scenario = JSON.parse(
		await readFile(`${directory}/query.json`, 'utf8').catch(() => '{}'),
	) as { operation?: string; delayMs?: number; fail?: boolean };
	if (scenario.operation !== operation) return;
	if (
		scenario.delayMs &&
		Number.isInteger(scenario.delayMs) &&
		scenario.delayMs > 0 &&
		scenario.delayMs <= 3000
	)
		await new Promise((resolve) => setTimeout(resolve, scenario.delayMs));
	if (scenario.fail) throw new Error('Synthetic database read failure.');
}
