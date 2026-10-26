import { spawn } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { writeFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { temporaryDatabase, fixtureUser } from '../tests/fixtures/database';

if (process.env.CI !== 'true' || process.env.VERCEL)
	throw new Error(
		'Production E2E requires an isolated CI process. Local agent checks require an explicit commit request.',
	);
const database = await temporaryDatabase();
const baseURL = 'https://localhost:3443';
const environment: NodeJS.ProcessEnv = {
	PATH: process.env.PATH,
	HOME: process.env.HOME,
	TMPDIR: process.env.TMPDIR,
	CI: 'true',
	APP_ENV: 'test',
	NODE_ENV: 'production',
	GITHUB_SHA: process.env.GITHUB_SHA ?? 'local',
	TURSO_DATABASE_URL: database.url,
	BETTER_AUTH_SECRET: 'synthetic-ci-only-auth-secret-32-characters',
	BETTER_AUTH_URL: baseURL,
	BETTER_AUTH_TRUSTED_ORIGINS: baseURL,
	ADMIN_USER_IDS: fixtureUser.id,
	BLOB_PUBLIC_HOSTNAME: 'https://fixture.public.blob.vercel-storage.com',
	// The nonce harness uses VERCEL_ENV=preview; keep its selected Blob store synthetic.
	BLOB_PREVIEW_PUBLIC_HOSTNAME: 'https://fixture.public.blob.vercel-storage.com',
	LASTFM_USERNAME: 'fixture',
	LASTFM_API_KEY: 'synthetic-ci-only',
	HEALTH_READINESS_TOKEN: 'synthetic-ci-only-readiness',
	CSP_PUBLIC_MODE: 'enforce',
	CSP_ADMIN_MODE: 'enforce',
	CSP_ADMIN_POLICY: 'nonce',
	VERCEL_ENV: 'preview',
	PLAYWRIGHT_BASE_URL: baseURL,
	CSP_TEST_BASE_URL: baseURL,
	CSP_TEST_ADMIN_EMAIL: fixtureUser.email,
	CSP_TEST_ADMIN_PASSWORD: fixtureUser.password,
	TEST_FIXTURE_DIRECTORY: database.directory,
	// Next.js follows Server Action redirects over this harness's HTTPS origin.
	NODE_EXTRA_CA_CERTS: `${database.directory}/cert.pem`,
};

async function run(command: string, arguments_: string[]) {
	const child = spawn(command, arguments_, { stdio: 'inherit', env: environment });
	const [code] = await once(child, 'exit');
	if (code !== 0) throw new Error(`Isolated command failed: ${command}`);
}

function start(arguments_: string[]) {
	return spawn('pnpm', arguments_, {
		stdio: 'inherit',
		env: environment,
		detached: process.platform !== 'win32',
	});
}

async function stop(child: ReturnType<typeof spawn> | undefined) {
	if (!child?.pid || child.exitCode !== null) return;
	const exited = once(child, 'exit');
	const signal = (value: NodeJS.Signals) => {
		if (child.exitCode !== null) return;
		if (process.platform === 'win32') child.kill(value);
		else process.kill(-child.pid!, value);
	};
	signal('SIGTERM');
	const timer = setTimeout(() => signal('SIGKILL'), 5000);
	try {
		await exited;
	} finally {
		clearTimeout(timer);
	}
}

let application: ReturnType<typeof spawn> | undefined;
try {
	await writeFile(`${database.directory}/music.txt`, 'empty');
	await run('openssl', [
		'req',
		'-x509',
		'-newkey',
		'rsa:2048',
		'-nodes',
		'-keyout',
		`${database.directory}/key.pem`,
		'-out',
		`${database.directory}/cert.pem`,
		'-days',
		'1',
		'-subj',
		'/CN=localhost',
		'-addext',
		'subjectAltName=DNS:localhost',
	]);
	// Fresh output only; never restore build artifacts or .next/cache.
	await rm('.next', { recursive: true, force: true });
	await run('pnpm', ['build']);
	application = start(['start', '--hostname', '127.0.0.1', '--port', '3001']);
	let cliReady = false;
	for (let attempt = 0; attempt < 60 && !cliReady; attempt++) {
		if (application.exitCode !== null) throw new Error('next start exited before readiness.');
		cliReady = await fetch('http://127.0.0.1:3001/api/health', {
			redirect: 'error',
			signal: AbortSignal.timeout(1000),
		}).then(
			(response) => response.status === 200,
			() => false,
		);
		if (!cliReady) await new Promise((resolve) => setTimeout(resolve, 500));
	}
	if (!cliReady) throw new Error('next start did not become ready.');
	for (const path of ['/', '/api/auth/ok']) {
		const response = await fetch(`http://127.0.0.1:3001${path}`, {
			redirect: 'error',
			signal: AbortSignal.timeout(15000),
		});
		if (response.status !== 200) throw new Error('next start smoke check failed.');
		await response.arrayBuffer();
	}
	await stop(application);
	application = start(['exec', 'tsx', 'scripts/production-server.mts']);
	let ready = false;
	for (let attempt = 0; attempt < 60 && !ready; attempt++) {
		if (application.exitCode !== null)
			throw new Error('Production server exited before readiness.');
		ready = await new Promise<boolean>((resolve) => {
			const probe = httpsRequest(
				`${baseURL}/api/health`,
				{ rejectUnauthorized: false },
				(response) => {
					response.resume();
					resolve(response.statusCode === 200);
				},
			);
			probe.on('error', () => resolve(false));
			probe.setTimeout(1000, () => {
				probe.destroy();
				resolve(false);
			});
			probe.end();
		});
		if (!ready) await new Promise((resolve) => setTimeout(resolve, 500));
	}
	if (!ready) throw new Error('Production server did not become healthy.');
	await run('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)]);
} finally {
	await stop(application);
	await database.close();
}
