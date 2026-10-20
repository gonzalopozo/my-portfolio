import { readFile } from 'node:fs/promises';

if (process.env.CI !== 'true' || process.env.APP_ENV !== 'test' || process.env.VERCEL)
	throw new Error('Offline fixtures cannot run on hosted deployments.');
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : String(input));
	if (['localhost', '127.0.0.1'].includes(url.hostname)) return originalFetch(input, init);
	if (url.origin === 'https://fixture.public.blob.vercel-storage.com') {
		const { readFixture } = await import('./blob');
		return readFixture(url);
	}
	if (url.href === 'https://example.com/ci-og-page')
		return new Response('<meta property="og:image" content="https://example.com/ci-og.png">', {
			headers: { 'content-type': 'text/html' },
		});
	if (url.href === 'https://example.com/ci-og.png')
		return new Response(
			Uint8Array.from(
				Buffer.from(
					'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
					'base64',
				),
			),
			{ headers: { 'content-type': 'image/png' } },
		);
	if (url.origin === 'https://ws.audioscrobbler.com') {
		const scenario = await readFile(
			`${process.env.TEST_FIXTURE_DIRECTORY}/music.txt`,
			'utf8',
		).catch(() => 'empty');
		if (scenario.trim() === 'failure') return new Response('{}', { status: 503 });
		return Response.json({ recenttracks: { track: [] } });
	}
	throw new Error('Unexpected external request in isolated production tests.');
};
