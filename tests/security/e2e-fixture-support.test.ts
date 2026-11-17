import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getTestClientHeaders,
	getTestNamespace,
	writeFixtureScenario,
} from '../../e2e/fixture-support';

describe('parallel test identities', () => {
	const identity = {
		testId: 'cms-icon',
		project: { name: 'chromium' },
		repeatEachIndex: 0,
		retry: 0,
	};

	it('keeps an attempt stable while separating tests, projects, repetitions and retries', () => {
		const variants = [
			identity,
			{ ...identity, testId: 'cms-settings' },
			{ ...identity, project: { name: 'firefox' } },
			{ ...identity, project: { name: 'webkit' } },
			{ ...identity, project: { name: 'mobile-chromium' } },
			{ ...identity, project: { name: 'api' } },
			{ ...identity, repeatEachIndex: 1 },
			{ ...identity, retry: 1 },
		];
		expect(getTestNamespace({ ...identity })).toBe(getTestNamespace(identity));
		expect(new Set(variants.map(getTestNamespace)).size).toBe(variants.length);
		const prefixes = variants.map((variant) => {
			const address = getTestClientHeaders(variant)['x-forwarded-for'] ?? '';
			expect(isIP(address)).toBe(6);
			expect(address).toMatch(/^fd/);
			return address.split(':').slice(0, 4).join(':');
		});
		expect(new Set(prefixes).size).toBe(variants.length);
	});
});

describe('atomic production scenarios', () => {
	let directory: string;
	beforeEach(async () => {
		await mkdir('.ci', { recursive: true });
		directory = await mkdtemp(resolve('.ci/database-'));
		vi.stubEnv('CI', undefined);
		vi.stubEnv('APP_ENV', 'test');
		vi.stubEnv('PORTFOLIO_TEST_BUILD', 'true');
		vi.stubEnv('VERCEL', undefined);
		vi.stubEnv('TEST_FIXTURE_DIRECTORY', directory);
		await writeFixtureScenario('query.json', '{}');
	});
	afterEach(async () => {
		vi.unstubAllEnvs();
		await rm(directory, { recursive: true, force: true });
	});

	it('never exposes incomplete JSON to concurrent readers during publication and reset', async () => {
		const scenario = JSON.stringify({
			operation: 'db.projects.read.public',
			padding: 'x'.repeat(65536),
		});
		let finished = false;
		let reads = 0;
		async function readScenarios() {
			do {
				const contents = await readFile(`${directory}/query.json`, 'utf8');
				expect(['{}', scenario]).toContain(contents);
				reads++;
			} while (!finished);
		}
		async function publishScenarios() {
			try {
				for (let index = 0; index < 20; index++)
					await writeFixtureScenario('query.json', index % 2 === 0 ? scenario : '{}');
			} finally {
				finished = true;
			}
		}
		const results = await Promise.allSettled([readScenarios(), publishScenarios()]);
		for (const result of results) if (result.status === 'rejected') throw result.reason;
		expect(reads).toBeGreaterThan(0);
		expect(await readdir(directory)).toEqual(['query.json']);
	});

	it('publishes provider recovery without temporary files remaining', async () => {
		await writeFixtureScenario('music.txt', 'failure');
		expect(await readFile(`${directory}/music.txt`, 'utf8')).toBe('failure');
		await writeFixtureScenario('music.txt', 'empty');
		expect(await readFile(`${directory}/music.txt`, 'utf8')).toBe('empty');
		expect((await readdir(directory)).sort()).toEqual(['music.txt', 'query.json']);
	});

	it.each([
		['APP_ENV', 'production'],
		['PORTFOLIO_TEST_BUILD', undefined],
		['PORTFOLIO_TEST_BUILD', 'false'],
		['VERCEL', '1'],
		['TEST_FIXTURE_DIRECTORY', undefined],
		['TEST_FIXTURE_DIRECTORY', resolve('.ci/other')],
	] as const)('refuses scenario writes in %s=%s', async (name, value) => {
		vi.stubEnv(name, value);
		await expect(writeFixtureScenario('query.json', '{}')).rejects.toThrow('owned production');
		expect(await readFile(`${directory}/query.json`, 'utf8')).toBe('{}');
		expect(await readdir(directory)).toEqual(['query.json']);
	});
});
