// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAdminUserIds } from '@/lib/security/admin-allowlist';

const mocks = vi.hoisted(() => ({ getServerSession: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/server-session', () => ({ getServerSession: mocks.getServerSession }));
vi.mock('next/navigation', () => ({
	redirect: (path: string) => {
		throw new Error(`REDIRECT:${path}`);
	},
}));

import { getAdminSession, requireAdmin, requireAdminPage } from '@/lib/admin';

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv('ADMIN_USER_IDS', ' admin-1, admin-2, admin-1 ');
	mocks.getServerSession.mockResolvedValue({ user: { id: 'admin-1' } });
});
afterEach(() => vi.unstubAllEnvs());

describe('explicit administrator authorization', () => {
	it('normalizes whitespace and duplicate stable IDs', () => {
		expect([...parseAdminUserIds(' first, second,first ')]).toEqual(['first', 'second']);
	});
	it.each([
		undefined,
		'',
		' ',
		'admin-1,',
		'admin-1,,admin-2',
		'admin-1,invalid id',
		'admin-1,*',
	])('fails closed for configuration %s', (value) => {
		expect(parseAdminUserIds(value).size).toBe(0);
	});
	it('returns the validated allowlisted session', async () => {
		expect(await requireAdmin()).toEqual({ user: { id: 'admin-1' } });
	});
	it('does not grant access through an email address or another valid session', async () => {
		mocks.getServerSession.mockResolvedValue({ user: { id: 'other', email: 'admin-1' } });
		expect(await getAdminSession()).toBeNull();
		await expect(requireAdmin()).rejects.toThrow('Access denied.');
		await expect(requireAdminPage()).rejects.toThrow('REDIRECT:/dashboard');
	});
	it('redirects unauthenticated operations without authorizing them', async () => {
		mocks.getServerSession.mockResolvedValue(null);
		await expect(requireAdmin()).rejects.toThrow('REDIRECT:/login');
	});
	it('grants no access when configuration disappears', async () => {
		vi.stubEnv('ADMIN_USER_IDS', '');
		await expect(requireAdmin()).rejects.toThrow('Access denied.');
	});
});
