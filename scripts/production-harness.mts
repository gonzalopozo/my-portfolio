import { spawn } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { temporaryDatabase, fixtureUser } from '../tests/fixtures/database';

export async function productionHarness(browserArguments?: string[]) {
	if (process.env.CI !== 'true' || process.env.VERCEL)
		throw new Error('The production harness requires an isolated synthetic process.');
	if (browserArguments && (process.env.CIRCLECI || process.env.GITHUB_ACTIONS))
		throw new Error('Playwright runs locally before commits and pushes, never in cloud CI.');
	await mkdir('.ci', { recursive: true });
	await mkdir('.ci/production-harness.lock').catch(() => {
		throw new Error('Another production harness owns the lock. See the local testing runbook.');
	});
	let database: Awaited<ReturnType<typeof temporaryDatabase>>;
	try {
		await writeFile(
			'.ci/production-harness.lock/owner.json',
			JSON.stringify({ pid: process.pid }),
		);
		database = await temporaryDatabase();
	} catch (error) {
		await rm('.ci/production-harness.lock', { recursive: true, force: true });
		throw error;
	}
	const previousTypes = await readFile('next-env.d.ts', 'utf8').catch(() => undefined);
	const baseURL = 'https://localhost:3443';
	const environment: NodeJS.ProcessEnv = {
		PATH: process.env.PATH,
		HOME: process.env.HOME,
		TMPDIR: process.env.TMPDIR,
		CI: 'true',
		APP_ENV: 'test',
		NODE_ENV: 'production',
		RELEASE_SHA: process.env.CIRCLE_SHA1 ?? 'local',
		PORTFOLIO_TEST_BUILD: 'true',
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

	let activeCommand: ReturnType<typeof spawn> | undefined;
	let interrupted = false;
	async function requireAvailablePort(port: number, host: string) {
		const server = createServer();
		await new Promise<void>((resolve, reject) => {
			server.once('error', () =>
				reject(new Error(`Production harness port ${port} is unavailable.`)),
			);
			server.listen(port, host, () => server.close(() => resolve()));
		});
	}

	async function run(command: string, arguments_: string[]) {
		if (interrupted) throw new Error('Production harness interrupted.');
		const child = spawn(command, arguments_, {
			stdio: 'inherit',
			env: environment,
			detached: process.platform !== 'win32',
		});
		activeCommand = child;
		try {
			const [code] = await once(child, 'exit');
			if (code !== 0 || interrupted) throw new Error(`Isolated command failed: ${command}`);
		} finally {
			activeCommand = undefined;
		}
	}

	function start(arguments_: string[]) {
		if (interrupted) throw new Error('Production harness interrupted.');
		return spawn('pnpm', arguments_, {
			stdio: 'inherit',
			env: environment,
			detached: process.platform !== 'win32',
		});
	}

	async function stop(child: ReturnType<typeof spawn> | undefined) {
		if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
		const exited = once(child, 'exit');
		const signal = (value: NodeJS.Signals) => {
			if (child.exitCode !== null || child.signalCode !== null) return;
			if (process.platform === 'win32') child.kill(value);
			else {
				try {
					process.kill(-child.pid!, value);
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
				}
			}
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
	const interrupt = () => {
		interrupted = true;
		void stop(activeCommand).catch(() => undefined);
		void stop(application).catch(() => undefined);
	};
	process.once('SIGINT', interrupt);
	process.once('SIGTERM', interrupt);
	try {
		await requireAvailablePort(3001, '127.0.0.1');
		await requireAvailablePort(3443, 'localhost');
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
		const certificate = await readFile(`${database.directory}/cert.pem`);
		// Fresh output only; never restore build artifacts or .next/cache.
		await rm('.ci/next-production', { recursive: true, force: true });
		await run('pnpm', ['build']);
		await requireAvailablePort(3001, '127.0.0.1');
		application = start(['start', '--hostname', '127.0.0.1', '--port', '3001']);
		let cliReady = false;
		for (let attempt = 0; attempt < 60 && !cliReady; attempt++) {
			if (interrupted) throw new Error('Production harness interrupted.');
			if (application.exitCode !== null || application.signalCode !== null)
				throw new Error('next start exited before readiness.');
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
		await requireAvailablePort(3443, 'localhost');
		application = start(['exec', 'tsx', 'scripts/production-server.mts']);
		let ready = false;
		for (let attempt = 0; attempt < 60 && !ready; attempt++) {
			if (interrupted) throw new Error('Production harness interrupted.');
			if (application.exitCode !== null || application.signalCode !== null)
				throw new Error('Production server exited before readiness.');
			ready = await new Promise<boolean>((resolve) => {
				// Trust this harness's certificate while preserving TLS and hostname validation.
				const probe = httpsRequest(
					`${baseURL}/api/health`,
					{ ca: certificate, rejectUnauthorized: true },
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
		if (browserArguments)
			await run('pnpm', ['exec', 'playwright', 'test', ...browserArguments]);
	} finally {
		process.removeListener('SIGINT', interrupt);
		process.removeListener('SIGTERM', interrupt);
		try {
			await stop(activeCommand);
			await stop(application);
		} finally {
			try {
				await database.close();
			} finally {
				if (previousTypes !== undefined) await writeFile('next-env.d.ts', previousTypes);
				else await rm('next-env.d.ts', { force: true });
				await rm('.ci/next-production', { recursive: true, force: true });
				await rm('.ci/production-harness.lock', { recursive: true, force: true });
			}
		}
	}
}
