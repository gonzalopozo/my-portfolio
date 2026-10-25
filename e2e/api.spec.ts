import { test, expect } from './fixtures';
import { fixtureUser } from '../tests/fixtures/database';

test('liveness is uncached and correlates the built release', async ({ request }) => {
	const response = await request.get('/api/health');
	expect(response.status()).toBe(200);
	expect(response.headers()['cache-control']).toContain('no-store');
	expect(await response.json()).toEqual({
		status: 'ok',
		release: process.env.GITHUB_SHA ?? 'local',
	});
});

test('readiness requires its separate credential', async ({ request }) => {
	expect((await request.get('/api/ready')).status()).toBe(401);
	expect(
		(
			await request.get('/api/ready', { headers: { authorization: 'Bearer invalid' } })
		).status(),
	).toBe(401);
	const response = await request.get('/api/ready', {
		headers: { authorization: `Bearer ${process.env.HEALTH_READINESS_TOKEN}` },
	});
	expect(response.status()).toBe(200);
	expect(await response.json()).toEqual({ status: 'ready' });
});

test('auth endpoints reject registration, invalid credentials and foreign origins', async ({
	request,
	baseURL,
}) => {
	expect((await request.get('/api/auth/ok')).status()).toBe(200);
	expect(await (await request.get('/api/auth/get-session')).json()).toBeNull();
	const signup = await request.post('/api/auth/sign-up/email', {
		headers: { origin: baseURL! },
		data: { name: 'No signup', email: 'signup@example.test', password: fixtureUser.password },
	});
	expect(signup.status()).toBe(400);
	expect(await signup.json()).toMatchObject({ code: 'EMAIL_PASSWORD_SIGN_UP_DISABLED' });
	const invalid = await request.post('/api/auth/sign-in/email', {
		headers: { origin: baseURL! },
		data: { email: fixtureUser.email, password: 'incorrect' },
	});
	expect(invalid.status()).toBe(401);
	const foreign = await request.post('/api/auth/sign-in/email', {
		headers: { origin: 'https://attacker.invalid' },
		data: { email: fixtureUser.email, password: fixtureUser.password },
	});
	expect(foreign.status()).toBe(403);
});

test('invalid-session cleanup refuses cross-origin posts and clears cookies safely', async ({
	request,
	baseURL,
}) => {
	expect(
		(
			await request.post('/api/auth/clear-invalid-session', {
				headers: { origin: 'https://attacker.invalid' },
				maxRedirects: 0,
			})
		).status(),
	).toBe(403);
	const response = await request.post('/api/auth/clear-invalid-session', {
		headers: { origin: baseURL!, cookie: '__Secure-better-auth.session_token=forged' },
		maxRedirects: 0,
	});
	expect(response.status()).toBe(303);
	expect(new URL(response.headers().location, baseURL).pathname).toBe('/login');
	expect(response.headers()['set-cookie']).toContain('Max-Age=0');
});
