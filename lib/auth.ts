import { db } from '@/db';
import { createAuthentication } from '@/lib/auth-config';

const platformOrigin =
	process.env.VERCEL === '1' && /^[a-z0-9-]+\.vercel\.app$/.test(process.env.VERCEL_URL ?? '')
		? `https://${process.env.VERCEL_URL}`
		: undefined;
const isVercelPreview = process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'preview';
if (isVercelPreview && !platformOrigin) {
	throw new Error('Vercel Preview authentication requires a valid VERCEL_URL hostname.');
}

export const auth = createAuthentication(db, {
	baseURL: isVercelPreview ? platformOrigin : undefined,
	trustedOrigins:
		[process.env.BETTER_AUTH_TRUSTED_ORIGINS, platformOrigin].filter(Boolean).join(',') ||
		undefined,
});
