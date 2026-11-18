import { spawn } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { temporaryDatabase, fixtureUser } from '../tests/fixtures/database';

export async function productionHarness(browserArguments?: string[]) {
	if (
		process.env.APP_ENV !== 'test' ||
		process.env.PORTFOLIO_TEST_BUILD !== 'true' ||
		process.env.VERCEL
	)
		throw new Error('The production harness requires an isolated synthetic process.');
	if (browserArguments && (process.env.CIRCLECI || process.env.GITHUB_ACTIONS))
		throw new Error('Playwright runs locally before commits and pushes, never in cloud CI.');
	const started = performance.now();
	const timings: { phase: string; durationMs: number; status: 'passed' | 'failed' }[] = [];
	async function measure<T>(phase: string, operation: () => Promise<T>): Promise<T> {
		const phaseStarted = performance.now();
		let status: 'passed' | 'failed' = 'failed';
		try {
			const result = await operation();
			status = 'passed';
			return result;
		} finally {
			const timing = {
				phase,
				durationMs: Math.round(performance.now() - phaseStarted),
				status,
			};
			timings.push(timing);
			console.info(JSON.stringify({ event: 'production-harness-phase', ...timing }));
		}
	}
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
		await rm('.ci/e2e-timings.json', { force: true });
		database = await measure('fixture-database', () => temporaryDatabase());
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
		...(process.env.CI === undefined ? {} : { CI: process.env.CI }),
		APP_ENV: 'test',
		NODE_ENV: 'production',
		NEXT_TELEMETRY_DISABLED: '1',
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
	const nextCli = createRequire(import.meta.url).resolve('next/dist/bin/next');
	function networkEnvironment(phase: 'build' | 'runtime'): NodeJS.ProcessEnv {
		return {
			...environment,
			TEST_NETWORK_PHASE: phase,
			// Only Next processes inherit the preload, including their build workers.
			NODE_OPTIONS: `--import=${new URL('./preload-network.mjs', import.meta.url).href}`,
		};
	}
	async function assertNetworkIsolation() {
		const failures = await readFile(`${database.directory}/network-failures.txt`, 'utf8');
		if (failures.trim()) throw new Error(`Unexpected isolated network requests:\n${failures}`);
	}

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

	async function run(command: string, arguments_: string[], childEnvironment = environment) {
		if (interrupted) throw new Error('Production harness interrupted.');
		const child = spawn(command, arguments_, {
			stdio: 'inherit',
			env: childEnvironment,
			detached: process.platform !== 'win32',
		});
		activeCommand = child;
		try {
			await once(child, 'exit');
			if (interrupted) throw new Error('Production harness interrupted.');
			const { exitCode, signalCode } = child;
			if (exitCode !== 0) {
				const reason = signalCode ? `signal ${signalCode}` : `exit code ${exitCode}`;
				throw new Error(`Isolated command failed (${reason}): ${command}`);
			}
		} finally {
			activeCommand = undefined;
		}
	}

	function start(arguments_: string[]) {
		if (interrupted) throw new Error('Production harness interrupted.');
		return spawn(process.execPath, arguments_, {
			stdio: 'inherit',
			env: networkEnvironment('runtime'),
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
	let completed = false;
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
		await writeFile(`${database.directory}/query.json`, '{}');
		await writeFile(`${database.directory}/network-failures.txt`, '');
		await measure('certificate', () =>
			run('openssl', [
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
			]),
		);
		const certificate = await readFile(`${database.directory}/cert.pem`);
		// Fresh output only; never restore build artifacts or .next/cache.
		await rm('.ci/next-production', { recursive: true, force: true });
		// Match pnpm build while confining the preload to Next, not pnpm or code generation.
		await measure('icons', () => run('pnpm', ['icons:manifest']));
		await measure('build', () =>
			run(process.execPath, [nextCli, 'build'], networkEnvironment('build')),
		);
		await assertNetworkIsolation();
		await measure('http-smoke', async () => {
			await requireAvailablePort(3001, '127.0.0.1');
			application = start([nextCli, 'start', '--hostname', '127.0.0.1', '--port', '3001']);
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
			await assertNetworkIsolation();
		});
		await measure('https-readiness', async () => {
			await requireAvailablePort(3443, 'localhost');
			application = start(['scripts/production-server.mts']);
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
		});
		if (browserArguments)
			await measure('playwright', () =>
				run('pnpm', ['exec', 'playwright', 'test', ...browserArguments]),
			);
		await measure('application-shutdown', async () => {
			await stop(application);
			await assertNetworkIsolation();
		});
		completed = true;
	} finally {
		let cleanupCompleted = false;
		process.removeListener('SIGINT', interrupt);
		process.removeListener('SIGTERM', interrupt);
		try {
			await measure('cleanup', async () => {
				const stopped = await Promise.allSettled([stop(activeCommand), stop(application)]);
				const cleaned = await Promise.allSettled([
					database.close(),
					previousTypes !== undefined
						? writeFile('next-env.d.ts', previousTypes)
						: rm('next-env.d.ts', { force: true }),
					rm('.ci/next-production', { recursive: true, force: true }),
				]);
				for (const result of [...stopped, ...cleaned])
					if (result.status === 'rejected') throw result.reason;
			});
			cleanupCompleted = true;
		} finally {
			const summary = {
				status: completed && cleanupCompleted ? 'passed' : 'failed',
				durationMs: Math.round(performance.now() - started),
				phases: timings,
			};
			try {
				await writeFile('.ci/e2e-timings.json', JSON.stringify(summary, null, 2));
				console.info(JSON.stringify({ event: 'production-harness-complete', ...summary }));
			} finally {
				await rm('.ci/production-harness.lock', { recursive: true, force: true });
			}
		}
	}
}
