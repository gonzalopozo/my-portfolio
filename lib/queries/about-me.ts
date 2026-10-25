import 'server-only';
import { requireAdminPage } from '@/lib/admin';
import { cacheLife, cacheTag } from 'next/cache';
import { db } from '@/db';
import { PUBLIC_SETTINGS_CACHE_TAG } from '@/lib/cache-tags';
import { type Settings } from '@/lib/types';

type InformationAboutMe = Omit<Settings, 'id' | 'updatedAt'>;

async function findInfoAboutMe(): Promise<InformationAboutMe | undefined> {
	return await db.query.siteSettings.findFirst({
		columns: {
			isEmployed: true,
			resumeUrl: true,
			statusMessage: true,
		},
	});
}

export async function getInfoAboutMe(): Promise<InformationAboutMe | undefined> {
	await requireAdminPage();
	return await findInfoAboutMe();
}

export async function getPublicInfoAboutMe(): Promise<InformationAboutMe | undefined> {
	'use cache';
	cacheLife('hours');
	cacheTag(PUBLIC_SETTINGS_CACHE_TAG);

	return await findInfoAboutMe();
}
