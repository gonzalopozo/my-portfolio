import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyPassword } from 'better-auth/crypto';
import type * as ProcessModule from 'node:process';
import type * as DatabaseModule from '../../db/client';
import { temporaryDatabase } from '../fixtures/database';
import { accounts, users } from '../../db/schema/better-auth';

const hostname = 'preview-setup-fixture.turso.io';
const password = 'Synthetic-preview-password-47!';
const mocks = vi.hoisted(() => ({
	databaseUrl: '',
	databaseCalls: 0,
	interactive: true,
	question: vi.fn(),
	close: vi.fn(),
}));
vi.mock('node:process', async (importOriginal) => ({
	...(await importOriginal<typeof ProcessModule>()),
	stdin: {
		get isTTY() {
			return mocks.interactive;
		},
	},
	stdout: { isTTY: true },
}));
vi.mock('node:readline/promises', () => ({
	createInterface: () => ({ question: mocks.question, close: mocks.close }),
}));
vi.mock('../../db/client', async (importOriginal) => {
	const actual = await importOriginal<typeof DatabaseModule>();
	return {
		...actual,
		openDatabase: (configuration: Parameters<typeof actual.openDatabase>[0]) => {
			if (!configuration.url.startsWith('libsql:')) return actual.openDatabase(configuration);
			mocks.databaseCalls++;
			return actual.openDatabase({ url: mocks.databaseUrl });
		},
	};
});

let database: Awaited<ReturnType<typeof temporaryDatabase>>;
let previousExitCode: typeof process.exitCode;

beforeEach(async () => {
	previousExitCode = process.exitCode;
	vi.resetAllMocks();
	database = await temporaryDatabase(false);
	mocks.databaseUrl = database.url;
	mocks.databaseCalls = 0;
	mocks.interactive = true;
	mocks.question.mockResolvedValue(hostname);
	vi.stubEnv('APP_ENV', 'preview');
	vi.stubEnv('VERCEL', undefined);
	vi.stubEnv('GITHUB_ACTIONS', undefined);
	vi.stubEnv('TURSO_DATABASE_URL', `libsql://${hostname}`);
	vi.stubEnv('TURSO_AUTH_TOKEN', 'synthetic-preview-database-token');
	vi.stubEnv('PREVIEW_ADMIN_EMAIL', 'preview-admin@example.test');
	vi.stubEnv('PREVIEW_ADMIN_PASSWORD', password);
	vi.spyOn(console, 'info').mockImplementation(() => {});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(async () => {
	process.exitCode = previousExitCode;
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	await database.close();
});

async function runSetup() {
	vi.resetModules();
	await import('../../scripts/provision-preview-admin.mjs');
}

describe('Preview administrator provisioning', () => {
	it('creates a usable credential account and returns its allowlist ID without secrets', async () => {
		await runSetup();
		const [user] = await database.db.select().from(users);
		const [account] = await database.db.select().from(accounts);
		expect(user.email).toBe('preview-admin@example.test');
		expect(account).toMatchObject({
			userId: user.id,
			accountId: user.id,
			providerId: 'credential',
		});
		expect(account.password).not.toBe(password);
		expect(await verifyPassword({ hash: account.password!, password })).toBe(true);
		expect(console.info).toHaveBeenCalledWith(`ADMIN_USER_IDS=${user.id}`);
		const output = JSON.stringify(vi.mocked(console.info).mock.calls);
		expect(output).not.toContain(password);
		expect(output).not.toContain('synthetic-preview-database-token');
		expect(console.error).not.toHaveBeenCalled();
		expect(mocks.close).toHaveBeenCalledOnce();
	});

	it('preserves the account ID and password hash when repeated with the same credentials', async () => {
		await runSetup();
		const before = await database.db.select().from(accounts);
		await runSetup();
		expect(await database.db.select().from(accounts)).toEqual(before);
		expect(await database.db.select().from(users)).toHaveLength(1);
		expect(console.error).not.toHaveBeenCalled();
	});

	it('refuses to reset an existing password', async () => {
		await runSetup();
		const before = await database.db.select().from(accounts);
		vi.stubEnv('PREVIEW_ADMIN_PASSWORD', 'Different-synthetic-password-47!');
		await runSetup();
		expect(process.exitCode).toBe(1);
		expect(await database.db.select().from(accounts)).toEqual(before);
		expect(await database.db.select().from(users)).toHaveLength(1);
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining('different credentials'),
		);
	});

	it('rolls back the user when credential creation fails and hides the database error', async () => {
		await database.client.execute(
			"CREATE TRIGGER reject_account BEFORE INSERT ON accounts BEGIN SELECT RAISE(ABORT, 'synthetic private database error'); END",
		);
		await runSetup();
		expect(process.exitCode).toBe(1);
		expect(await database.db.select().from(users)).toHaveLength(0);
		expect(await database.db.select().from(accounts)).toHaveLength(0);
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
			'synthetic private database error',
		);
	});

	it.each([
		['APP_ENV', 'production'],
		['VERCEL', '1'],
		['GITHUB_ACTIONS', 'true'],
		['TURSO_DATABASE_URL', 'https://unrelated.example.test'],
		['TURSO_AUTH_TOKEN', ''],
		['PREVIEW_ADMIN_EMAIL', 'owner@real-domain.com'],
		['PREVIEW_ADMIN_PASSWORD', 'short'],
	])('refuses unsafe setup configuration for %s before database access', async (name, value) => {
		vi.stubEnv(name, value);
		await runSetup();
		expect(process.exitCode).toBe(1);
		expect(mocks.databaseCalls).toBe(0);
		expect(await database.db.select().from(users)).toHaveLength(0);
	});

	it('requires an interactive owner confirmation of the exact database hostname', async () => {
		mocks.question.mockResolvedValue('another-database.turso.io');
		await runSetup();
		expect(process.exitCode).toBe(1);
		expect(mocks.databaseCalls).toBe(0);
		expect(mocks.close).toHaveBeenCalledOnce();
	});

	it('refuses noninteractive execution', async () => {
		mocks.interactive = false;
		await runSetup();
		expect(process.exitCode).toBe(1);
		expect(mocks.question).not.toHaveBeenCalled();
		expect(mocks.databaseCalls).toBe(0);
	});
});
