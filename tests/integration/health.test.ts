import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { temporaryDatabase } from '../fixtures/database';
import policy from '../../db/migrations/policy.json';

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: async () => {} }));
import { GET as live } from '../../app/api/health/route';
import { GET as ready } from '../../app/api/ready/route';

let fixture: Awaited<ReturnType<typeof temporaryDatabase>>;
beforeEach(async () => {
	fixture = await temporaryDatabase(false);
	vi.stubEnv('TURSO_DATABASE_URL', fixture.url);
	vi.stubEnv('HEALTH_READINESS_TOKEN', 'synthetic-ci-only-readiness');
	vi.stubEnv('NEXT_PUBLIC_RELEASE_SHA', 'a'.repeat(40));
});
afterEach(async () => {
	vi.unstubAllEnvs();
	await fixture.close();
});
const request = (authorization = 'Bearer synthetic-ci-only-readiness') =>
	new Request('https://app.example.test/api/ready', { headers: { authorization } });

describe('health and minimum schema readiness', () => {
	it('returns uncached public liveness without requiring the database', async () => {
		vi.stubEnv('TURSO_DATABASE_URL', 'invalid-private-database-url');
		const response = await live();
		expect(await response.json()).toEqual({ status: 'ok', release: 'a'.repeat(40) });
		for (const header of ['cache-control', 'cdn-cache-control', 'vercel-cdn-cache-control'])
			expect(response.headers.get(header)).toBe('no-store');
	});
	it('refuses missing or incorrect probe credentials before database initialization', async () => {
		vi.stubEnv('TURSO_DATABASE_URL', 'invalid-private-database-url');
		for (const authorization of ['', 'Bearer wrong'])
			expect((await ready(request(authorization))).status).toBe(401);
	});
	it('checks actual SQL/schema/ledger readiness without returning infrastructure data', async () => {
		const response = await ready(request());
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ready' });
	});
	it('keeps old compatible applications ready after a later expand migration', async () => {
		await fixture.client.execute('ALTER TABLE projects ADD COLUMN future_optional TEXT');
		await fixture.client.execute({
			sql: 'INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,?)',
			args: ['f'.repeat(64), Date.now()],
		});
		expect((await ready(request())).status).toBe(200);
	});
	it('fails safely if the deployment migration is missing', async () => {
		await fixture.client.execute({
			sql: 'DELETE FROM __drizzle_migrations WHERE hash=?',
			args: [policy.at(-1)!.sha256],
		});
		const response = await ready(request());
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ status: 'unavailable' });
	});
	it('does not expose malformed database configuration', async () => {
		vi.stubEnv('TURSO_DATABASE_URL', 'invalid-private-database-url');
		const response = await ready(request());
		expect(response.status).toBe(503);
		expect(await response.text()).not.toContain('private-database-url');
	});
});
