import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createAuthentication = vi.hoisted(() =>
	vi.fn((_database: unknown, configuration: unknown) => configuration),
);
vi.mock('@/db', () => ({ db: {} }));
vi.mock('@/lib/auth-config', () => ({ createAuthentication }));

beforeEach(() => {
	vi.resetModules();
	createAuthentication.mockClear();
	vi.stubEnv('VERCEL', '1');
	vi.stubEnv('VERCEL_ENV', 'preview');
	vi.stubEnv('VERCEL_URL', 'portfolio-first-deployment.vercel.app');
	vi.stubEnv('BETTER_AUTH_URL', 'https://stale-preview.vercel.app');
	vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', undefined);
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe('authentication deployment configuration', () => {
	it('uses the current Preview origin even when a stale base URL is configured', async () => {
		const { auth } = await import('@/lib/auth');
		expect(auth).toMatchObject({
			baseURL: 'https://portfolio-first-deployment.vercel.app',
			trustedOrigins: 'https://portfolio-first-deployment.vercel.app',
		});
	});

	it('follows a new deployment without editing the configured base URL or origins', async () => {
		await import('@/lib/auth');
		vi.stubEnv('VERCEL_URL', 'portfolio-next-deployment.vercel.app');
		vi.resetModules();
		const { auth } = await import('@/lib/auth');
		expect(auth).toMatchObject({
			baseURL: 'https://portfolio-next-deployment.vercel.app',
			trustedOrigins: 'https://portfolio-next-deployment.vercel.app',
		});
	});

	it('preserves configured aliases alongside the current deployment origin', async () => {
		vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', 'https://preview.example.test');
		const { auth } = await import('@/lib/auth');
		expect(auth).toMatchObject({
			baseURL: 'https://portfolio-first-deployment.vercel.app',
			trustedOrigins:
				'https://preview.example.test,https://portfolio-first-deployment.vercel.app',
		});
	});

	it('leaves Production base URL resolution to the configured environment', async () => {
		vi.stubEnv('VERCEL_ENV', 'production');
		vi.stubEnv('BETTER_AUTH_URL', 'https://www.gonzalopozo.dev');
		const { auth } = await import('@/lib/auth');
		expect(auth).toMatchObject({
			baseURL: undefined,
			trustedOrigins: 'https://portfolio-first-deployment.vercel.app',
		});
	});

	it('leaves local Preview simulations on their configured local base URL', async () => {
		vi.stubEnv('VERCEL', undefined);
		vi.stubEnv('APP_ENV', 'preview');
		vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
		vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', 'http://localhost:3000');
		const { auth } = await import('@/lib/auth');
		expect(auth).toMatchObject({
			baseURL: undefined,
			trustedOrigins: 'http://localhost:3000',
		});
	});

	it.each([
		undefined,
		'https://preview.vercel.app',
		'preview.vercel.app.attacker.invalid',
		'preview.vercel.app/path',
		'preview.vercel.app?token=private-token',
		'private-token@preview.vercel.app',
	])('rejects missing or malformed Preview metadata: %s', async (hostname) => {
		vi.stubEnv('VERCEL_URL', hostname);
		await expect(import('@/lib/auth')).rejects.toThrow(
			new Error('Vercel Preview authentication requires a valid VERCEL_URL hostname.'),
		);
		expect(createAuthentication).not.toHaveBeenCalled();
	});
});
