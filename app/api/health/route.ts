import { connection } from 'next/server';

const headers = {
	'Cache-Control': 'no-store',
	'CDN-Cache-Control': 'no-store',
	'Vercel-CDN-Cache-Control': 'no-store',
};

/** Liveness contains only public deployment identity and performs no dependency work. */
export async function GET() {
	await connection();
	return Response.json(
		{ status: 'ok', release: process.env.NEXT_PUBLIC_RELEASE_SHA ?? 'local' },
		{ headers },
	);
}
