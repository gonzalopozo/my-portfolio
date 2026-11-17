import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
	database: vi.fn(),
	mkdir: vi.fn(),
	rm: vi.fn(),
	writeFile: vi.fn(),
}));
vi.mock('../../tests/fixtures/database', () => ({
	temporaryDatabase: fixtures.database,
	fixtureUser: {},
}));
vi.mock('node:fs/promises', () => ({
	mkdir: fixtures.mkdir,
	rm: fixtures.rm,
	writeFile: fixtures.writeFile,
	readFile: vi.fn(),
}));
import { productionHarness } from '../../scripts/production-harness.mjs';

beforeEach(() => {
	vi.resetAllMocks();
	vi.spyOn(console, 'info').mockImplementation(() => {});
	for (const name of ['CI', 'CIRCLECI', 'GITHUB_ACTIONS', 'VERCEL']) vi.stubEnv(name, undefined);
	vi.stubEnv('APP_ENV', 'test');
	vi.stubEnv('PORTFOLIO_TEST_BUILD', 'true');
	fixtures.mkdir.mockResolvedValue(undefined);
	fixtures.rm.mockResolvedValue(undefined);
	fixtures.writeFile.mockResolvedValue(undefined);
	fixtures.database.mockRejectedValue(new Error('Fixture creation sentinel.'));
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('production harness entry guards', () => {
	it.each([
		['APP_ENV', undefined],
		['APP_ENV', 'production'],
		['PORTFOLIO_TEST_BUILD', undefined],
		['PORTFOLIO_TEST_BUILD', 'false'],
		['VERCEL', '1'],
	] as const)('rejects %s=%s before acquiring resources', async (name, value) => {
		vi.stubEnv(name, value);
		vi.stubEnv('CI', 'true');
		await expect(productionHarness([])).rejects.toThrow('isolated synthetic process');
		expect(fixtures.mkdir).not.toHaveBeenCalled();
		expect(fixtures.database).not.toHaveBeenCalled();
	});

	it.each(['CIRCLECI', 'GITHUB_ACTIONS'])(
		'rejects browser arguments in %s before acquiring resources',
		async (provider) => {
			vi.stubEnv(provider, 'true');
			await expect(productionHarness([])).rejects.toThrow('never in cloud CI');
			expect(fixtures.mkdir).not.toHaveBeenCalled();
			expect(fixtures.database).not.toHaveBeenCalled();
		},
	);

	it.each([undefined, 'false', 'true'])(
		'allows browser-free cloud smoke setup independently of CI=%s',
		async (ci) => {
			vi.stubEnv('CI', ci);
			vi.stubEnv('CIRCLECI', 'true');
			await expect(productionHarness()).rejects.toThrow('Fixture creation sentinel.');
			expect(fixtures.database).toHaveBeenCalledOnce();
			expect(fixtures.rm).toHaveBeenCalledWith('.ci/production-harness.lock', {
				recursive: true,
				force: true,
			});
		},
	);
});
