import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server-session';
import { parseAdminUserIds } from '@/lib/security/admin-allowlist';

/** Request-level memoization only; never persist a session in a shared cache. */
export const getAdminSession = cache(async () => {
	const session = await getServerSession();
	if (!session || !parseAdminUserIds(process.env.ADMIN_USER_IDS).has(session.user.id)) {
		return null;
	}
	return session;
});

/** Reject protected operations before validation, data access, or side effects. */
export async function requireAdmin() {
	const session = await getServerSession();
	if (!session) redirect('/login');
	const admin = await getAdminSession();
	if (!admin) throw new Error('Access denied.');
	return admin;
}

/** Send rejected reads to the overview, which supports session recovery and access denial. */
export async function requireAdminPage() {
	const session = await getAdminSession();
	if (!session) redirect('/dashboard');
	return session;
}
