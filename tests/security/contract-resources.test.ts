import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import type * as NodeCrypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
	readFile: vi.fn(),
	writeFile: vi.fn(),
	mkdir: vi.fn(),
	appendFile: vi.fn(),
	spawn: vi.fn(),
	applyMigrations: vi.fn(),
	close: vi.fn(),
}));
vi.mock('node:fs/promises', () => fixture);
vi.mock('node:crypto', async (importOriginal) => ({
	...(await importOriginal<typeof NodeCrypto>()),
	randomUUID: () => '12345678-1234-1234-1234-123456789abc',
}));
vi.mock('node:child_process', () => ({ spawn: fixture.spawn }));
vi.mock('../../db/client', () => ({
	openDatabase: () => ({ client: { close: fixture.close } }),
}));
vi.mock('../../scripts/database.mjs', () => ({ applyMigrations: fixture.applyMigrations }));

const name = 'ci-123-12345678';
const id = '12345678-1234-1234-1234-123456789abc';
const idSha256 = createHash('sha256').update(id).digest('hex');
const record = { name, group: 'ci-contracts', organization: 'fixture', idSha256, run: '123' };
const fetch = vi.fn<typeof globalThis.fetch>();
let originalArgv: string[];

beforeEach(() => {
	vi.resetModules();
	vi.resetAllMocks();
	originalArgv = process.argv;
	process.argv = ['node', 'contracts.mts'];
	vi.stubEnv('GITHUB_ACTIONS', 'true');
	vi.stubEnv('GITHUB_REF', 'refs/heads/main');
	vi.stubEnv('GITHUB_RUN_ID', '123');
	vi.stubEnv('APP_ENV', 'contract');
	vi.stubEnv('TURSO_NONPRODUCTION_ORG', 'fixture');
	vi.stubEnv('TURSO_NONPRODUCTION_GROUP', 'ci-contracts');
	vi.stubEnv('TURSO_API_TOKEN', 'synthetic-api-token');
	vi.stubGlobal('fetch', fetch);
	fixture.readFile.mockResolvedValue(JSON.stringify(record));
	fixture.spawn.mockImplementation(() => {
		const child = new EventEmitter();
		queueMicrotask(() => child.emit('exit', 0));
		return child;
	});
	fetch.mockImplementation(async (_url, options) => {
		if (options?.method === 'DELETE') return new Response(null, { status: 204 });
		return Response.json({ database: { Name: name, DbId: id, Hostname: 'fixture.turso.io' } });
	});
});
afterEach(() => {
	process.argv = originalArgv;
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('contract resource configuration', () => {
	it.each([
		['TURSO_NONPRODUCTION_ORG', 'https://turso.tech/fixture'],
		['TURSO_NONPRODUCTION_GROUP', 'preview-database'],
	])('identifies invalid %s before accessing Turso', async (variable, value) => {
		vi.stubEnv(variable, value);
		await expect(import('../../scripts/contracts.mjs')).rejects.toThrow(variable);
		expect(fetch).not.toHaveBeenCalled();
		expect(fixture.writeFile).not.toHaveBeenCalled();
		expect(fixture.spawn).not.toHaveBeenCalled();
	});

	it('trims copied owner and group whitespace before creating its own database', async () => {
		vi.stubEnv('TURSO_NONPRODUCTION_ORG', ' fixture\r\n');
		vi.stubEnv('TURSO_NONPRODUCTION_GROUP', '\tci-contracts\n');
		fetch
			.mockResolvedValueOnce(
				Response.json({ database: { Name: name, DbId: id, Hostname: 'fixture.turso.io' } }),
			)
			.mockResolvedValueOnce(Response.json({ jwt: 'synthetic-database-token' }));
		await import('../../scripts/contracts.mjs');
		expect(fetch).toHaveBeenNthCalledWith(
			1,
			'https://api.turso.tech/v1/organizations/fixture/databases',
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ name, group: 'ci-contracts' }),
			}),
		);
		expect(fixture.writeFile).toHaveBeenLastCalledWith(
			'.ci/contract-resource.json',
			JSON.stringify({ ...record, deleted: true }),
		);
	});

	it('trims copied owner and group whitespace before checking cleanup ownership', async () => {
		process.argv.push('cleanup');
		vi.stubEnv('TURSO_NONPRODUCTION_ORG', ' fixture\r\n');
		vi.stubEnv('TURSO_NONPRODUCTION_GROUP', '\tci-contracts\n');
		await import('../../scripts/contracts.mjs');
		expect(fetch).toHaveBeenLastCalledWith(
			`https://api.turso.tech/v1/organizations/fixture/databases/${name}`,
			expect.objectContaining({ method: 'DELETE' }),
		);
		expect(fixture.writeFile).toHaveBeenCalledWith(
			'.ci/contract-resource.json',
			JSON.stringify({ ...record, deleted: true }),
		);
	});
});

describe('contract resource ownership records', () => {
	it('persists only the identity fingerprint for creation and deletion', async () => {
		fetch
			.mockResolvedValueOnce(
				Response.json({ database: { Name: name, DbId: id, Hostname: 'fixture.turso.io' } }),
			)
			.mockResolvedValueOnce(Response.json({ jwt: 'synthetic-database-token' }));
		await import('../../scripts/contracts.mjs');
		expect(fixture.writeFile.mock.calls).toEqual([
			['.ci/contract-resource.json', JSON.stringify(record)],
			['.ci/contract-resource.json', JSON.stringify({ ...record, deleted: true })],
		]);
		for (const [, contents] of fixture.writeFile.mock.calls) {
			expect(contents).not.toContain(id);
			expect(contents).not.toContain('synthetic-database-token');
		}
		expect(fixture.close).toHaveBeenCalledOnce();
	});

	it.each([undefined, null, {}, '', 'x'.repeat(129), 'unsafe\nidentifier', '../other'])(
		'rejects an invalid upstream database ID before persisting ownership',
		async (databaseId) => {
			fetch.mockResolvedValueOnce(
				Response.json({
					database: { Name: name, DbId: databaseId, Hostname: 'fixture.turso.io' },
				}),
			);
			await expect(import('../../scripts/contracts.mjs')).rejects.toThrow(
				'database identifier',
			);
			expect(fixture.writeFile).not.toHaveBeenCalled();
			expect(fetch).toHaveBeenCalledTimes(1);
		},
	);

	it('cleans up the created database if a later operation fails', async () => {
		fetch
			.mockResolvedValueOnce(
				Response.json({ database: { Name: name, DbId: id, Hostname: 'fixture.turso.io' } }),
			)
			.mockResolvedValueOnce(new Response(null, { status: 503 }));
		await expect(import('../../scripts/contracts.mjs')).rejects.toThrow(
			'operation failed (503)',
		);
		expect(fetch.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
		expect(fixture.writeFile).toHaveBeenLastCalledWith(
			'.ci/contract-resource.json',
			JSON.stringify({ ...record, deleted: true }),
		);
	});

	it('deletes an interrupted resource only when its identity fingerprint still matches', async () => {
		process.argv.push('cleanup');
		await import('../../scripts/contracts.mjs');
		expect(fetch.mock.calls[1]).toEqual([
			`https://api.turso.tech/v1/organizations/fixture/databases/${name}`,
			expect.objectContaining({ method: 'DELETE' }),
		]);
		expect(fixture.writeFile).toHaveBeenCalledWith(
			'.ci/contract-resource.json',
			JSON.stringify({ ...record, deleted: true }),
		);
	});

	it('does not delete a replacement database with the same name', async () => {
		process.argv.push('cleanup');
		fetch.mockResolvedValueOnce(
			Response.json({ database: { Name: name, DbId: 'replacement-database-id' } }),
		);
		await expect(import('../../scripts/contracts.mjs')).rejects.toThrow('identity changed');
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(fixture.writeFile).not.toHaveBeenCalled();
	});

	it.each([
		{ run: '456' },
		{ name: 'ci-456-12345678' },
		{ organization: 'other' },
		{ group: 'ci-other' },
		{ idSha256: undefined, id },
		{ idSha256: 'invalid' },
	])('rejects cleanup records with unproven ownership', async (overrides) => {
		process.argv.push('cleanup');
		fixture.readFile.mockResolvedValueOnce(JSON.stringify({ ...record, ...overrides }));
		await expect(import('../../scripts/contracts.mjs')).rejects.toThrow(
			'ownership is unproven',
		);
		expect(fetch).not.toHaveBeenCalled();
		expect(fixture.writeFile).not.toHaveBeenCalled();
	});

	it('retains the fingerprint record when deletion fails so cleanup can retry', async () => {
		process.argv.push('cleanup');
		fetch
			.mockResolvedValueOnce(Response.json({ database: { Name: name, DbId: id } }))
			.mockResolvedValueOnce(new Response(null, { status: 503 }));
		await expect(import('../../scripts/contracts.mjs')).rejects.toThrow(
			'operation failed (503)',
		);
		expect(fixture.writeFile).not.toHaveBeenCalled();
	});
});
