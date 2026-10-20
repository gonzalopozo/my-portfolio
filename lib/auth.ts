import { db } from '@/db';
import { createAuthentication } from '@/lib/auth-config';

const platformOrigin =
	process.env.VERCEL === '1' && /^[a-z0-9-]+\.vercel\.app$/.test(process.env.VERCEL_URL ?? '')
		? `https://${process.env.VERCEL_URL}`
		: undefined;
export const auth = createAuthentication(db, {
	trustedOrigins:
		[process.env.BETTER_AUTH_TRUSTED_ORIGINS, platformOrigin].filter(Boolean).join(',') ||
		undefined,
});
