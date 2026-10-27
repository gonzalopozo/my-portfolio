import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { openDatabase } from '../db/client';
import { applyMigrations } from './database.mjs';
import { required } from './platform.mjs';

if (
	process.env.GITHUB_ACTIONS !== 'true' ||
	process.env.GITHUB_REF !== 'refs/heads/main' ||
	process.env.APP_ENV !== 'contract'
)
	throw new Error('Remote contracts require the protected main workflow.');
const organization = required('TURSO_NONPRODUCTION_ORG');
const group = required('TURSO_NONPRODUCTION_GROUP');
if (!/^[a-z0-9-]+$/.test(organization) || !/^ci-[a-z0-9-]+$/.test(group))
	throw new Error('Contracts require a dedicated ci-* database group.');
const run = required('GITHUB_RUN_ID');
const name = `ci-${run}-${randomUUID().slice(0, 8)}`;
if (!/^ci-[0-9]+-[a-f0-9]{8}$/.test(name)) throw new Error('Invalid owned test database name.');
const base = `https://api.turso.tech/v1/organizations/${organization}/databases`;

/** Persist a bounded fingerprint for ownership checks, never opaque response data. */
function databaseIdentity(id: unknown) {
	if (typeof id !== 'string' || id.length === 0 || id.length > 128 || /[^A-Za-z0-9_-]/.test(id))
		throw new Error('Invalid contract database identifier.');
	return createHash('sha256').update(id).digest('hex');
}

async function request<T>(suffix: string, method: string, body?: unknown): Promise<T> {
	const response = await fetch(`${base}${suffix}`, {
		method,
		redirect: 'error',
		signal: AbortSignal.timeout(30000),
		headers: {
			authorization: `Bearer ${required('TURSO_API_TOKEN')}`,
			'content-type': 'application/json',
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok)
		throw new Error(`Turso contract resource operation failed (${response.status}).`);
	if (response.status === 204) return undefined as T;
	try {
		return (await response.json()) as T;
	} catch {
		throw new Error('Turso returned invalid metadata; response omitted.');
	}
}
if (process.argv[2] === 'cleanup') {
	const record = JSON.parse(
		await readFile('.ci/contract-resource.json', 'utf8').catch(() => 'null'),
	) as {
		name: string;
		group: string;
		organization: string;
		idSha256: string;
		run: string;
		deleted?: boolean;
	} | null;
	if (record && !record.deleted) {
		if (
			!record.name.startsWith(`ci-${run}-`) ||
			!/^ci-[0-9]+-[a-f0-9]{8}$/.test(record.name) ||
			record.group !== group ||
			record.organization !== organization ||
			record.run !== run ||
			typeof record.idSha256 !== 'string' ||
			!/^[a-f0-9]{64}$/.test(record.idSha256)
		)
			throw new Error('Cleanup ownership is unproven.');
		const current = await request<{ database: { DbId: string; Name: string } }>(
			`/${record.name}`,
			'GET',
		);
		if (
			databaseIdentity(current.database.DbId) !== record.idSha256 ||
			current.database.Name !== record.name
		)
			throw new Error('Cleanup database identity changed.');
		await request(`/${record.name}`, 'DELETE');
		await writeFile('.ci/contract-resource.json', JSON.stringify({ ...record, deleted: true }));
	}
} else {
	let identity: string | undefined;
	try {
		const result = await request<{
			database: { Name: string; DbId: string; Hostname: string };
		}>('', 'POST', { name, group });
		if (
			result.database.Name !== name ||
			!/^[a-z0-9.-]+\.turso\.io$/.test(result.database.Hostname)
		)
			throw new Error('Unexpected contract database identity.');
		identity = databaseIdentity(result.database.DbId);
		await mkdir('.ci', { recursive: true });
		await writeFile(
			'.ci/contract-resource.json',
			JSON.stringify({
				name,
				group,
				organization,
				idSha256: identity,
				run,
			}),
		);
		const token = await request<{ jwt: string }>(
			`/${name}/auth/tokens?expiration=1h&authorization=full-access`,
			'POST',
		);
		const url = `libsql://${result.database.Hostname}`;
		const connection = openDatabase({ url, authToken: token.jwt });
		try {
			await applyMigrations(connection.client);
		} finally {
			connection.client.close();
		}
		const environment: NodeJS.ProcessEnv = {
			...process.env,
			TURSO_DATABASE_URL: url,
			TURSO_AUTH_TOKEN: token.jwt,
			TURSO_CONTRACT_DATABASE_NAME: name,
		};
		delete environment.TURSO_API_TOKEN;
		const child = spawn('pnpm', ['test:contract'], { stdio: 'inherit', env: environment });
		const [code] = await once(child, 'exit');
		if (code !== 0) throw new Error('Remote service contracts failed.');
	} finally {
		// Delete only the resource created successfully by this exact invocation.
		if (identity) {
			await request(`/${name}`, 'DELETE');
			await writeFile(
				'.ci/contract-resource.json',
				JSON.stringify({
					name,
					group,
					organization,
					idSha256: identity,
					run,
					deleted: true,
				}),
			);
		}
	}
}
