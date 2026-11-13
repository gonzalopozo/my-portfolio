import { resolve } from 'node:path';
import sharp from 'sharp';

/** Shared by the isolated network harness and the pinned OG transport. */
export async function ogImageFixture(url: URL): Promise<Response> {
	const directory = resolve(/* turbopackIgnore: true */ process.env.TEST_FIXTURE_DIRECTORY ?? '');
	if (
		process.env.CI !== 'true' ||
		process.env.APP_ENV !== 'test' ||
		process.env.VERCEL ||
		!directory.startsWith(`${resolve('.ci')}/database-`)
	) {
		throw new Error('Unsafe OG fixture operation.');
	}
	if (url.href === 'https://example.com/ci-og-page') {
		return new Response('<meta property="og:image" content="https://example.com/ci-og.png">', {
			headers: { 'content-type': 'text/html' },
		});
	}
	if (url.href === 'https://example.com/ci-og.png') {
		const bytes = await sharp({
			create: { width: 1, height: 1, channels: 4, background: 'red' },
		})
			.png()
			.toBuffer();
		return new Response(new Uint8Array(bytes), { headers: { 'content-type': 'image/png' } });
	}
	throw new Error('Unexpected OG fixture request.');
}
