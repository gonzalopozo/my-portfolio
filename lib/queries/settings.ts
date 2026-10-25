import 'server-only';
import { requireAdminPage } from '@/lib/admin';
import { db } from '@/db';
import { type Settings } from '@/lib/types';

export async function getSiteSettings(): Promise<Settings | undefined> {
	await requireAdminPage();
	return await db.query.siteSettings.findFirst();
}
