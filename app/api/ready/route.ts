import { connection } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@libsql/client';
import { observeOperation } from '@/lib/observability/operation';
import policy from '@/db/migrations/policy.json';

const headers = {
	'Cache-Control': 'no-store',
	'CDN-Cache-Control': 'no-store',
	'Vercel-CDN-Cache-Control': 'no-store',
};

/** Authenticated dependency readiness; no infrastructure identifiers leave this route. */
export async function GET(request: Request) {
	await connection();
	const expected = process.env.HEALTH_READINESS_TOKEN;
	const actual = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
	if (
		!expected ||
		Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
		!timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
	)
		return Response.json({ status: 'unauthorized' }, { status: 401, headers });
	let client: ReturnType<typeof createClient> | undefined;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		const expectedMigration = policy.at(-1)?.sha256;
		if (!expectedMigration) throw new Error('Missing migration readiness contract.');
		client = createClient({
			url: process.env.TURSO_DATABASE_URL!,
			authToken: process.env.TURSO_AUTH_TOKEN,
		});
		const connection = client;
		const results = await observeOperation('database.readiness', () =>
			Promise.race([
				connection.batch(
					[
						'SELECT 1',
						{
							sql: 'SELECT hash FROM __drizzle_migrations WHERE hash = ? LIMIT 1',
							args: [expectedMigration],
						},
						'SELECT id, key, count, last_request FROM rate_limits LIMIT 0',
					],
					'read',
				),
				new Promise<never>((_, reject) => {
					timeout = setTimeout(() => {
						reject(new Error('Readiness timeout'));
					}, 3000);
				}),
			]),
		);
		// Newer expand migrations must not make an older compatible deployment unready.
		if (results[1].rows[0]?.hash !== expectedMigration)
			throw new Error('Database migration readiness mismatch.');
		return Response.json({ status: 'ready' }, { headers });
	} catch {
		return Response.json({ status: 'unavailable' }, { status: 503, headers });
	} finally {
		clearTimeout(timeout);
		client?.close();
	}
}
