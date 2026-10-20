import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createAuthentication } from '../../lib/auth-config';
import { temporaryDatabase, fixtureUser } from '../fixtures/database';
import { sessions } from '../../db/schema';
import { eq } from 'drizzle-orm';

let fixture: Awaited<ReturnType<typeof temporaryDatabase>>;
const baseURL = 'https://auth.example.test';
beforeEach(async () => {
	fixture = await temporaryDatabase();
});
afterEach(async () => {
	await fixture.close();
});

function authentication() {
	return createAuthentication(fixture.db, {
		baseURL,
		secret: 'synthetic-integration-secret-at-least-32-characters',
		trustedOrigins: baseURL,
	});
}
function jsonRequest(path: string, data: unknown, origin = baseURL) {
	return new Request(`${baseURL}/api/auth/${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin, 'x-forwarded-for': '192.0.2.10' },
		body: JSON.stringify(data),
	});
}

describe('real better-auth and migrated libSQL', () => {
	it('signs in, reads the session, and invalidates it on logout', async () => {
		const auth = authentication();
		const login = await auth.handler(
			jsonRequest('sign-in/email', {
				email: fixtureUser.email,
				password: fixtureUser.password,
			}),
		);
		expect(login.status).toBe(200);
		const cookies = login.headers
			.getSetCookie()
			.map((value) => value.split(';')[0])
			.join('; ');
		expect(cookies).toContain('session_token');
		const session = await auth.handler(
			new Request(`${baseURL}/api/auth/get-session`, { headers: { cookie: cookies } }),
		);
		expect((await session.json()).user.id).toBe(fixtureUser.id);
		const logout = await auth.handler(
			new Request(`${baseURL}/api/auth/sign-out`, {
				method: 'POST',
				headers: { origin: baseURL, cookie: cookies },
			}),
		);
		expect(logout.status).toBe(200);
		expect(await fixture.db.select().from(sessions)).toEqual([]);
	});
	it('rejects wrong passwords, public signup, and cross-origin login', async () => {
		const auth = authentication();
		expect(
			(
				await auth.handler(
					jsonRequest('sign-in/email', {
						email: fixtureUser.email,
						password: 'incorrect',
					}),
				)
			).status,
		).toBe(401);
		const signup = await auth.handler(
			jsonRequest('sign-up/email', {
				name: 'Unexpected',
				email: 'signup@example.test',
				password: fixtureUser.password,
			}),
		);
		expect(signup.status).toBe(400);
		expect(await signup.json()).toMatchObject({ code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED' });
		expect(
			(
				await auth.handler(
					jsonRequest(
						'sign-in/email',
						{ email: fixtureUser.email, password: fixtureUser.password },
						'https://attacker.invalid',
					),
				)
			).status,
		).toBe(403);
		expect(await fixture.db.select().from(sessions)).toEqual([]);
	});
	it('rejects an expired signed session without accepting a cached cookie', async () => {
		const auth = authentication();
		const login = await auth.handler(
			jsonRequest('sign-in/email', {
				email: fixtureUser.email,
				password: fixtureUser.password,
			}),
		);
		const token = login.headers
			.getSetCookie()
			.find((value) => value.startsWith('__Secure-better-auth.session_token='))
			?.split(';')[0];
		expect(token).toBeTruthy();
		await fixture.db
			.update(sessions)
			.set({ expiresAt: new Date(0) })
			.where(eq(sessions.userId, fixtureUser.id));
		const response = await auth.handler(
			new Request(`${baseURL}/api/auth/get-session?disableCookieCache=true`, {
				headers: { cookie: token! },
			}),
		);
		expect(await response.json()).toBeNull();
		for (const cookie of ['', '__Secure-better-auth.session_token=forged']) {
			const result = await auth.handler(
				new Request(`${baseURL}/api/auth/get-session`, { headers: { cookie } }),
			);
			expect(await result.json()).toBeNull();
		}
	});

	it('persists rate limiting across authentication instances', async () => {
		let limited = false;
		for (let index = 0; index < 12; index++) {
			const response = await authentication().handler(
				jsonRequest('sign-in/email', { email: fixtureUser.email, password: 'incorrect' }),
			);
			if (response.status === 429) {
				limited = true;
				break;
			}
		}
		expect(limited).toBe(true);
		expect(
			(await fixture.client.execute('SELECT count(*) AS count FROM rate_limits')).rows[0]
				.count,
		).toBeGreaterThan(0);
	});
});
