import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startFixtureNetwork } from '../fixtures/network';
import { putFixture, deleteFixture } from '../fixtures/blob';
import { LASTFM_ENDPOINT } from '../fixtures/music';

let directory: string;
let server: ReturnType<typeof startFixtureNetwork> | undefined;
const execFileAsync = promisify(execFile);

beforeEach(async () => {
	await mkdir('.ci', { recursive: true });
	directory = await mkdtemp(resolve('.ci/database-'));
	vi.stubEnv('CI', undefined);
	vi.stubEnv('APP_ENV', 'test');
	vi.stubEnv('PORTFOLIO_TEST_BUILD', 'true');
	vi.stubEnv('VERCEL', undefined);
	vi.stubEnv('TEST_FIXTURE_DIRECTORY', directory);
	vi.stubEnv('TEST_NETWORK_PHASE', 'runtime');
	await writeFile(`${directory}/music.txt`, 'empty');
	await writeFile(`${directory}/network-failures.txt`, '');
});
afterEach(async () => {
	server?.close();
	server = undefined;
	vi.unstubAllEnvs();
	await rm(directory, { recursive: true, force: true });
});

describe('isolated MSW fixtures', () => {
	it.each([undefined, 'false', 'true'])(
		'intercepts providers independently of CI=%s',
		async (ci) => {
			vi.stubEnv('CI', ci);
			server = startFixtureNetwork();
			expect(await (await fetch(LASTFM_ENDPOINT)).json()).toEqual({
				recenttracks: { track: [] },
			});
			expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe('');
		},
	);
	it.each(['build', 'runtime'])(
		'preloads fixtures into a %s process and its worker',
		async (phase) => {
			const workerCode = `
				const { parentPort } = require('node:worker_threads');
				fetch('${LASTFM_ENDPOINT}')
					.then((response) => response.json())
					.then((data) => parentPort.postMessage(data));
			`;
			const workerFile = `${directory}/network-worker.cjs`;
			await writeFile(workerFile, workerCode);
			const code = `
				const { Worker } = require('node:worker_threads');
				Promise.all([
					fetch('${LASTFM_ENDPOINT}').then((response) => response.json()),
					new Promise((resolve, reject) => {
						const worker = new Worker(${JSON.stringify(workerFile)});
						worker.once('message', resolve);
						worker.once('error', reject);
					}),
				]).then((results) => console.log(JSON.stringify(results)));
			`;
			const { stdout } = await execFileAsync(process.execPath, ['--eval', code], {
				env: {
					...process.env,
					NODE_OPTIONS: `--import=${new URL('../../scripts/preload-network.mjs', import.meta.url).href}`,
					TEST_NETWORK_PHASE: phase,
				},
				timeout: 15_000,
			});
			expect(JSON.parse(stdout)).toEqual([
				{ recenttracks: { track: [] } },
				{ recenttracks: { track: [] } },
			]);
			expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe('');
		},
		20_000,
	);

	it.each([
		['PORTFOLIO_TEST_BUILD', undefined],
		['APP_ENV', 'production'],
		['PORTFOLIO_TEST_BUILD', 'false'],
		['VERCEL', '1'],
		['TEST_FIXTURE_DIRECTORY', undefined],
		['TEST_FIXTURE_DIRECTORY', resolve('.ci/other')],
		['TEST_NETWORK_PHASE', undefined],
		['TEST_NETWORK_PHASE', 'development'],
	] as const)('rejects an unsafe environment: %s=%s', (name, value) => {
		vi.stubEnv(name, value);
		expect(() => startFixtureNetwork()).toThrow('isolated production harness');
	});

	it('reads Last.fm scenario changes without restarting interception', async () => {
		server = startFixtureNetwork();
		await expect((await fetch(LASTFM_ENDPOINT)).json()).resolves.toEqual({
			recenttracks: { track: [] },
		});
		await writeFile(`${directory}/music.txt`, 'failure');
		expect((await fetch(LASTFM_ENDPOINT)).status).toBe(503);
		await writeFile(`${directory}/music.txt`, 'empty');
		expect((await fetch(LASTFM_ENDPOINT)).status).toBe(200);
		expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe('');
	});

	it.each([
		{ url: 'https://unexpected.example.test/private?api_key=secret', method: 'GET' },
		{ url: 'https://ws.audioscrobbler.com/wrong-path?api_key=secret', method: 'GET' },
		{ url: LASTFM_ENDPOINT, method: 'POST' },
		{ url: 'https://fonts.googleapis.com/css2?family=Geist', method: 'GET' },
		{ url: 'https://fonts.googleapis.com.evil.test/css2', method: 'GET' },
	])('blocks and records unexpected requests: $method $url', async ({ url, method }) => {
		server = startFixtureNetwork();
		await expect(fetch(url, { method })).rejects.toThrow();
		const failures = await readFile(`${directory}/network-failures.txt`, 'utf8');
		expect(failures).toBe(`${method} ${new URL(url).origin}\n`);
		expect(failures).not.toContain('secret');
		expect(failures).not.toContain('private');
	});

	it('passes requests through to the local application', async () => {
		const application = createServer((_request, response) => response.end('local application'));
		await new Promise<void>((resolve) => application.listen(0, '127.0.0.1', resolve));
		try {
			const address = application.address();
			if (!address || typeof address === 'string') throw new Error('Missing local port.');
			server = startFixtureNetwork();
			const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
			expect(await response.text()).toBe('local application');
			expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe('');
		} finally {
			application.closeAllConnections();
			await new Promise<void>((resolve, reject) => {
				application.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});

	it('records a handler failure even when the caller catches it', async () => {
		await writeFile(`${directory}/music.txt`, 'invalid');
		server = startFixtureNetwork();
		const response = await fetch(LASTFM_ENDPOINT);
		expect(response.status).toBe(500);
		expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe(
			'Handler failed: GET https://ws.audioscrobbler.com\n',
		);
	});

	it('serves owned Blob bytes and returns 404 after deletion', async () => {
		server = startFixtureNetwork();
		const blob = await putFixture('skill-icons/test.svg', '<svg/>', {
			access: 'public',
			addRandomSuffix: false,
		});
		const response = await fetch(blob.url);
		expect(response.headers.get('content-type')).toBe('image/svg+xml');
		expect(await response.text()).toBe('<svg/>');
		await deleteFixture(blob.url);
		expect((await fetch(blob.url)).status).toBe(404);
		expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe('');
	});

	it('serves the existing exact OG page and PNG fixtures', async () => {
		server = startFixtureNetwork();
		const page = await fetch('https://example.com/ci-og-page');
		expect(page.headers.get('content-type')).toBe('text/html');
		expect(await page.text()).toContain('https://example.com/ci-og.png');
		const image = await fetch('https://example.com/ci-og.png');
		expect(image.headers.get('content-type')).toBe('image/png');
		const bytes = new Uint8Array(await image.arrayBuffer());
		expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(await readFile(`${directory}/network-failures.txt`, 'utf8')).toBe('');
	});
});
