import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.VERCEL || process.env.CIRCLECI || process.env.GITHUB_ACTIONS) {
	throw new Error('The Playwright component gallery runs locally.');
}

const host = '127.0.0.1';
const port = '3100';
const repository = fileURLToPath(new URL('../', import.meta.url));
const workDirectory = join(repository, '.ci');
const lockDirectory = join(workDirectory, 'component-gallery.lock');
const next = createRequire(import.meta.url).resolve('next/dist/bin/next');
const environment: NodeJS.ProcessEnv = {
	PATH: process.env.PATH,
	HOME: process.env.HOME,
	TMPDIR: process.env.TMPDIR,
	APP_ENV: 'test',
	NODE_ENV: 'production',
	NEXT_TELEMETRY_DISABLED: '1',
	PORTFOLIO_COMPONENT_GALLERY_ROOT: repository,
	TURSO_DATABASE_URL: 'file::memory:',
	BETTER_AUTH_URL: `http://${host}:${port}`,
	BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
};
const assets = [
	'arroyomolinos.jpg',
	'cv_pic.png',
	'hobbies/basketball_dark.png',
	'hobbies/basketball_light.png',
	'hobbies/cars_dark.png',
	'hobbies/cars_light.png',
];

let child: ChildProcess | undefined;
let interrupted: NodeJS.Signals | undefined;
let shutdownTimer: ReturnType<typeof setTimeout> | undefined;

function stop(signal: NodeJS.Signals) {
	if (interrupted) return;
	interrupted = signal;
	const runningChild = child;
	if (!runningChild) return;

	runningChild.kill(signal);
	shutdownTimer = setTimeout(() => runningChild.kill('SIGKILL'), 5_000);
	shutdownTimer.unref();
}

async function run(command: string, args: string[]) {
	if (interrupted) return;

	const runningChild = spawn(command, args, {
		cwd: repository,
		env: environment,
		stdio: ['ignore', 'inherit', 'inherit'],
	});
	child = runningChild;
	try {
		await new Promise<void>((resolve, reject) => {
			runningChild.once('error', reject);
			runningChild.once('close', (code, signal) => {
				if (code === 0 || interrupted) resolve();
				else
					reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`));
			});
		});
	} finally {
		child = undefined;
		clearTimeout(shutdownTimer);
	}
}

await mkdir(workDirectory, { recursive: true });
await mkdir(lockDirectory).catch((error: NodeJS.ErrnoException) => {
	if (error.code === 'EEXIST') {
		throw new Error(`The local component gallery is locked at ${lockDirectory}.`, {
			cause: error,
		});
	}
	throw error;
});

let gallery: string | undefined;
const onInterrupt = () => stop('SIGINT');
const onTerminate = () => stop('SIGTERM');
process.on('SIGINT', onInterrupt);
process.on('SIGTERM', onTerminate);

try {
	const directory = await mkdtemp(join(workDirectory, 'component-gallery-'));
	gallery = directory;
	await cp(join(repository, 'playwright/gallery'), directory, { recursive: true });
	await Promise.all(
		assets.map(async (asset) => {
			const destination = join(directory, 'public', asset);
			await mkdir(dirname(destination), { recursive: true });
			await cp(join(repository, 'public', asset), destination);
		}),
	);
	await run('pnpm', ['icons:manifest']);
	await run(process.execPath, [next, 'build', directory]);
	await run(process.execPath, [next, 'start', directory, '--hostname', host, '--port', port]);
} finally {
	try {
		if (gallery) await rm(gallery, { recursive: true, force: true });
	} finally {
		await rm(lockDirectory, { recursive: true, force: true });
		process.off('SIGINT', onInterrupt);
		process.off('SIGTERM', onTerminate);
	}
}

if (interrupted) process.exitCode = interrupted === 'SIGINT' ? 130 : 143;
