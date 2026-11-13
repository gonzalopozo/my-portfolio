import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ reconcile: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/og-image/store', () => ({ reconcileProjectImages: mocks.reconcile }));
import { GET } from '@/app/api/cron/og-images/route';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	mocks.reconcile.mockReset();
});
describe('OG recovery cron authorization', () => {
	it.each([undefined, '', 'Bearer wrong'])(
		'rejects missing or incorrect credentials before doing work',
		async (authorization) => {
			vi.stubEnv('CRON_SECRET', 'synthetic-cron-secret');
			const response = await GET(
				new Request('https://example.test/api/cron/og-images', {
					headers: authorization ? { authorization } : {},
				}),
			);
			expect(response.status).toBe(401);
			expect(response.headers.get('cache-control')).toBe('no-store');
			expect(mocks.reconcile).not.toHaveBeenCalled();
		},
	);
	it('fails closed when no secret is configured', async () => {
		vi.stubEnv('CRON_SECRET', undefined);
		expect(
			(
				await GET(
					new Request('https://example.test/api/cron/og-images', {
						headers: { authorization: 'Bearer ' },
					}),
				)
			).status,
		).toBe(401);
	});
	it('runs recovery with its own credential and no admin cookie', async () => {
		vi.stubEnv('CRON_SECRET', 'synthetic-cron-secret');
		mocks.reconcile.mockResolvedValue({ processed: 2, failed: 0 });
		const response = await GET(
			new Request('https://example.test/api/cron/og-images', {
				headers: { authorization: 'Bearer synthetic-cron-secret' },
			}),
		);
		expect(await response.json()).toEqual({ processed: 2, failed: 0 });
		expect(response.headers.get('cache-control')).toBe('no-store');
	});
	it('returns a safe failure reference when recovery is unavailable', async () => {
		vi.stubEnv('CRON_SECRET', 'synthetic-cron-secret');
		vi.spyOn(console, 'error').mockImplementation(() => {});
		mocks.reconcile.mockRejectedValue(new Error('database password secret'));
		const response = await GET(
			new Request('https://example.test/api/cron/og-images', {
				headers: { authorization: 'Bearer synthetic-cron-secret' },
			}),
		);
		expect(response.status).toBe(503);
		expect(JSON.stringify(await response.json())).not.toContain('password');
	});
});
