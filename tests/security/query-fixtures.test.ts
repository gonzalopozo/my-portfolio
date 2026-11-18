import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeQuery } from '../fixtures/query';
import { ogImageFixture } from '../fixtures/og-image';

let directory: string;
beforeEach(async () => {
	await mkdir('.ci', { recursive: true });
	directory = await mkdtemp(resolve('.ci/database-'));
	vi.stubEnv('CI', undefined);
	vi.stubEnv('APP_ENV', 'test');
	vi.stubEnv('PORTFOLIO_TEST_BUILD', 'true');
	vi.stubEnv('VERCEL', undefined);
	vi.stubEnv('TEST_FIXTURE_DIRECTORY', directory);
});
afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	await rm(directory, { recursive: true, force: true });
});

describe('scoped production query fixtures', () => {
	it.each([undefined, 'false', 'true'])(
		'confines an admin failure without depending on CI=%s',
		async (ci) => {
			vi.stubEnv('CI', ci);
			await writeFile(
				`${directory}/query.json`,
				JSON.stringify({ operation: 'db.projects.read.admin', fail: true }),
			);
			await expect(beforeQuery('db.projects.read.public')).resolves.toBeUndefined();
			await expect(beforeQuery('database.readiness')).resolves.toBeUndefined();
			await expect(beforeQuery('db.projects.read.admin')).rejects.toThrow(
				'Synthetic database read failure',
			);
			const response = await ogImageFixture(new URL('https://example.com/ci-og-page'));
			expect(await response.text()).toContain('https://example.com/ci-og.png');
			await writeFile(`${directory}/query.json`, '{}');
			await expect(beforeQuery('db.projects.read.admin')).resolves.toBeUndefined();
		},
	);

	it('applies public latency only to public reads', async () => {
		await writeFile(
			`${directory}/query.json`,
			JSON.stringify({ operation: 'db.projects.read.public', delayMs: 25 }),
		);
		const timer = vi.spyOn(globalThis, 'setTimeout');
		await beforeQuery('db.projects.read.admin');
		expect(timer).not.toHaveBeenCalled();
		await beforeQuery('db.projects.read.public');
		expect(timer).toHaveBeenCalledWith(expect.any(Function), 25);
	});

	it.each([-1, 1.5, 3001])('does not schedule an unsafe delay of %s ms', async (delayMs) => {
		await writeFile(
			`${directory}/query.json`,
			JSON.stringify({ operation: 'db.projects.read.public', delayMs }),
		);
		const timer = vi.spyOn(globalThis, 'setTimeout');
		await beforeQuery('db.projects.read.public');
		expect(timer).not.toHaveBeenCalled();
	});

	it.each([
		['APP_ENV', 'production'],
		['PORTFOLIO_TEST_BUILD', undefined],
		['PORTFOLIO_TEST_BUILD', 'false'],
		['VERCEL', '1'],
		['TEST_FIXTURE_DIRECTORY', undefined],
		['TEST_FIXTURE_DIRECTORY', resolve('.ci/other')],
	] as const)('rejects unsafe fixture activation: %s=%s', async (name, value) => {
		vi.stubEnv(name, value);
		await expect(beforeQuery('db.projects.read.admin')).rejects.toThrow('isolated database');
		await expect(ogImageFixture(new URL('https://example.com/ci-og-page'))).rejects.toThrow(
			'Unsafe OG fixture',
		);
	});
});
