import { appendFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { passthrough } from 'msw';
import { http, HttpResponse } from 'msw/http';
import { createNetworkServer } from './network-server';
import { LASTFM_ENDPOINT, lastFmResponse } from './music';
import { readFixture } from './blob';
import { ogImageFixture } from './og-image';

/** Only the harness preloads this module; deployed Next.js code never imports MSW. */
export function startFixtureNetwork() {
	const directory = resolve(process.env.TEST_FIXTURE_DIRECTORY ?? '');
	if (
		process.env.CI !== 'true' ||
		process.env.APP_ENV !== 'test' ||
		process.env.PORTFOLIO_TEST_BUILD !== 'true' ||
		process.env.VERCEL ||
		!directory.startsWith(`${resolve('.ci')}/database-`) ||
		!['build', 'runtime'].includes(process.env.TEST_NETWORK_PHASE ?? '')
	) {
		throw new Error('Offline fixtures require an isolated production harness.');
	}

	const server = createNetworkServer(
		[
			http.all(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//, () => passthrough()),
			http.get('https://fixture.public.blob.vercel-storage.com/*', ({ request }) =>
				readFixture(new URL(request.url)),
			),
			http.get('https://example.com/ci-og-page', ({ request }) =>
				ogImageFixture(new URL(request.url)),
			),
			http.get('https://example.com/ci-og.png', ({ request }) =>
				ogImageFixture(new URL(request.url)),
			),
			http.get(LASTFM_ENDPOINT, async () => {
				const scenario = await readFile(`${directory}/music.txt`, 'utf8');
				if (scenario.trim() === 'failure') return new HttpResponse('{}', { status: 503 });
				if (scenario.trim() === 'empty') return lastFmResponse();
				throw new Error('Unknown music fixture scenario.');
			}),
			...(process.env.TEST_NETWORK_PHASE === 'build'
				? [http.get(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, () => passthrough())]
				: []),
		],
		(destination) => {
			// Synchronous append survives a caught request error or worker exit.
			appendFileSync(`${directory}/network-failures.txt`, `${destination}\n`);
		},
	);
	server.listen({ onUnhandledFrame: 'error' });
	return server;
}
