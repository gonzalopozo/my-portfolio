import { createHash } from 'node:crypto';
import { readFile, mkdtemp, cp, readdir, rm, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createClient, type Client } from '@libsql/client';

const folder = resolve('db/migrations');
type Entry = { idx: number; when: number; tag: string; breakpoints: boolean };
type Policy = { tag: string; sha256: string; kind: 'baseline' | 'expand' | 'contract' };

export async function migrationFiles() {
	const journal = JSON.parse(await readFile(`${folder}/meta/_journal.json`, 'utf8')) as {
		entries: Entry[];
	};
	const policies = JSON.parse(await readFile(`${folder}/policy.json`, 'utf8')) as Policy[];
	if (policies.length !== journal.entries.length)
		throw new Error('Migration policy is incomplete.');
	return Promise.all(
		journal.entries.map(async (entry, index) => {
			const sql = await readFile(`${folder}/${entry.tag}.sql`, 'utf8');
			const hash = createHash('sha256').update(sql).digest('hex');
			const policy = policies[index];
			if (entry.idx !== index || policy.tag !== entry.tag || policy.sha256 !== hash)
				throw new Error('Migration history or approved SQL hash changed.');
			return {
				...entry,
				hash,
				kind: policy.kind,
				sql: sql.split('--> statement-breakpoint'),
			};
		}),
	);
}

/** Serialize writers with a database write transaction, including ledger validation. */
export async function applyMigrations(
	client: Client,
	production = false,
	maximum = Number.POSITIVE_INFINITY,
) {
	const files = (await migrationFiles()).slice(0, maximum);
	await client.execute('PRAGMA foreign_keys = ON');
	const objects = await client.execute(
		"SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
	);
	const ledger = await client.execute(
		"SELECT name FROM sqlite_schema WHERE name='__drizzle_migrations'",
	);
	if (objects.rows.length && !ledger.rows.length)
		throw new Error(
			'Existing database has no migration ledger. Approved baseline is required.',
		);
	await client.execute(
		'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)',
	);
	const transaction = await client.transaction('write');
	try {
		const applied = await transaction.execute(
			'SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at, id',
		);
		for (const [index, row] of applied.rows.entries()) {
			if (
				!files[index] ||
				row.hash !== files[index].hash ||
				Number(row.created_at) !== files[index].when
			)
				throw new Error('Migration ledger is not a verified prefix of this release.');
		}
		if (production) {
			const reference = createClient({ url: 'file::memory:' });
			try {
				for (const file of files.slice(0, applied.rows.length))
					for (const statement of file.sql)
						if (statement.trim()) await reference.execute(statement);
				if ((await schemaSignature(reference)) !== (await schemaSignature(transaction)))
					throw new Error(
						'Production schema drift differs from its verified migration ledger.',
					);
			} finally {
				reference.close();
			}
		}
		for (const file of files.slice(applied.rows.length)) {
			if (production && file.kind !== 'expand')
				throw new Error('Production automation accepts expand migrations only.');
			if (
				production &&
				file.sql.some(
					(statement) =>
						/^\s*(?:DROP|DELETE|TRUNCATE|UPDATE)\b/i.test(
							statement.replace(/--[^\n]*/g, ''),
						) ||
						(/\bALTER\s+TABLE\b/i.test(statement) &&
							(/\b(?:DROP|RENAME)\b/i.test(statement) ||
								(/\bNOT\s+NULL\b/i.test(statement) &&
									!/\bDEFAULT\b/i.test(statement)))),
				)
			)
				throw new Error('Expand migration contains an incompatible operation.');
			for (const statement of file.sql)
				if (statement.trim()) await transaction.execute(statement);
			await transaction.execute({
				sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
				args: [file.hash, file.when],
			});
		}
		const integrity = await transaction.execute('PRAGMA foreign_key_check');
		if (integrity.rows.length) throw new Error('Migration violates referential integrity.');
		await transaction.commit();
	} finally {
		if (!transaction.closed) await transaction.rollback();
		transaction.close();
	}
}

async function requireTarget() {
	const url = process.env.TURSO_DATABASE_URL;
	if (!url) throw new Error('TURSO_DATABASE_URL is required.');
	const production = process.env.APP_ENV === 'production';
	if (production) {
		let target: URL;
		try {
			target = new URL(url);
		} catch {
			throw new Error('Invalid production database URL.');
		}
		if (
			target.protocol !== 'libsql:' ||
			!/^[a-z0-9.-]+\.turso\.io$/.test(target.hostname) ||
			target.username ||
			target.password ||
			target.port ||
			!['', '/'].includes(target.pathname) ||
			target.search ||
			target.hash ||
			!process.env.TURSO_AUTH_TOKEN
		)
			throw new Error(
				'Production migrations require an authenticated remote Turso database.',
			);
	}
	if (
		!url.startsWith('file:') &&
		!['preview', 'contract', 'production'].includes(process.env.APP_ENV ?? '')
	)
		throw new Error('Remote migrations require an explicit environment.');
	if (
		production &&
		(process.env.GITHUB_ACTIONS !== 'true' ||
			process.env.GITHUB_REF !== 'refs/heads/main' ||
			process.env.MIGRATION_APPROVED !== 'true' ||
			!process.env.TURSO_RECOVERY_POINT)
	)
		throw new Error(
			'Production requires protected main workflow approval and a recorded recovery point.',
		);
	if (production) {
		const { requireApprovalEnvironment } = await import('./approval.mjs');
		await requireApprovalEnvironment('production-migrations', true);
		const sha = process.env.EXPECTED_SHA;
		if (
			!/^[a-f0-9]{40}$/.test(sha ?? '') ||
			execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== sha
		)
			throw new Error('Migration checkout differs from the approved release SHA.');
		const { api, required } = await import('./platform.mjs');
		const branch = await api<{ object: { sha: string } }>(
			'github',
			`/repos/${required('GITHUB_REPOSITORY')}/git/ref/heads/main`,
		);
		if (branch.object.sha !== sha) throw new Error('Main changed before migration approval.');
	}
	return { url, authToken: process.env.TURSO_AUTH_TOKEN, production };
}

async function schemaSignature(client: Pick<Client, 'execute'>) {
	const result = await client.execute(
		"SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' AND tbl_name != '__drizzle_migrations' ORDER BY type, name",
	);
	return JSON.stringify(
		result.rows.map((row) => [
			row.type,
			row.name,
			row.tbl_name,
			String(row.sql).replace(/\s+/g, ' ').trim(),
		]),
	);
}

async function main() {
	const operation = process.argv[2];
	if (operation === 'check') {
		const temporary = await mkdtemp(resolve('.ci/migrations-'));
		try {
			await cp(folder, `${temporary}/migrations`, { recursive: true });
			const config = `${temporary}/drizzle.config.mts`;
			const output = relative(process.cwd(), `${temporary}/migrations`);
			await writeFile(
				config,
				`import { defineConfig } from 'drizzle-kit';\nexport default defineConfig({dialect:'turso',schema:'./db/schema/*.ts',out:${JSON.stringify(output)},casing:'snake_case'});\n`,
			);
			const generated = spawnSync(
				'pnpm',
				['exec', 'drizzle-kit', 'generate', '--config', config],
				{ encoding: 'utf8', timeout: 120000 },
			);
			process.stdout.write(generated.stdout ?? '');
			process.stderr.write(generated.stderr ?? '');
			if (generated.status !== 0) throw new Error('Migration generation failed.');
			if (
				(await readdir(`${temporary}/migrations`)).filter((name) => name.endsWith('.sql'))
					.length !== (await migrationFiles()).length
			)
				throw new Error('Schema changes need a committed, reviewed migration.');
			// Drizzle can print an error and still exit zero; require its clean-schema result.
			if (!generated.stdout?.includes('No schema changes, nothing to migrate'))
				throw new Error('Migration generation did not confirm a clean schema.');
			const count = (await migrationFiles()).length;
			for (let prefix = 0; prefix <= count; prefix++) {
				const client = createClient({ url: `file:${temporary}/prefix-${prefix}.db` });
				try {
					await applyMigrations(client, false, prefix);
					await applyMigrations(client);
					await applyMigrations(client);
				} finally {
					client.close();
				}
			}
		} finally {
			await rm(temporary, { recursive: true, force: true });
		}
		return;
	}
	const target = await requireTarget();
	if (operation === 'push') {
		if (
			!target.url.startsWith('file:') ||
			process.env.APP_ENV === 'production' ||
			process.env.VERCEL
		)
			throw new Error('Schema pushing is restricted to disposable local file databases.');
		const result = spawnSync(
			'pnpm',
			['exec', 'drizzle-kit', 'push', '--config', './db/drizzle.config.ts'],
			{ stdio: 'inherit' },
		);
		if (result.status !== 0) throw new Error('Local schema push failed.');
		return;
	}
	const client = createClient(target);
	try {
		if (operation === 'apply') await applyMigrations(client, target.production);
		else if (operation === 'baseline') {
			const files = await migrationFiles();
			const tag = process.env.MIGRATION_BASELINE_TAG;
			const index = files.findIndex((file) => file.tag === tag);
			if (index < 0 || process.env.BASELINE_APPROVED !== 'true')
				throw new Error('Baseline needs an approved exact migration tag.');
			const reference = createClient({ url: 'file::memory:' });
			let expectedSchema: string;
			try {
				for (const file of files.slice(0, index + 1))
					for (const sql of file.sql) if (sql.trim()) await reference.execute(sql);
				expectedSchema = await schemaSignature(reference);
			} finally {
				reference.close();
			}
			const transaction = await client.transaction('write');
			try {
				if (expectedSchema !== (await schemaSignature(transaction)))
					throw new Error('Baseline schema differs; stop and reconcile drift manually.');
				await transaction.execute(
					'CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash TEXT NOT NULL, created_at NUMERIC)',
				);
				if ((await transaction.execute('SELECT id FROM __drizzle_migrations')).rows.length)
					throw new Error('Baseline cannot overwrite a ledger.');
				for (const file of files.slice(0, index + 1))
					await transaction.execute({
						sql: 'INSERT INTO __drizzle_migrations (hash,created_at) VALUES (?,?)',
						args: [file.hash, file.when],
					});
				await transaction.commit();
			} finally {
				if (!transaction.closed) await transaction.rollback();
				transaction.close();
			}
		} else throw new Error('Unknown database operation.');
	} finally {
		client.close();
	}
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
	const { mkdir } = await import('node:fs/promises');
	await mkdir('.ci', { recursive: true });
	await main();
}
