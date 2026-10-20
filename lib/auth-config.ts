import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as authSchema from '@/db/schema/better-auth';
import { nextCookies } from 'better-auth/next-js';
import { getTrustedOrigins } from '@/lib/security/trusted-origins';
import type { openDatabase } from '@/db/client';
import { randomUUID } from 'node:crypto';
import { reportCaughtFailure } from '@/lib/observability/caught';

export function createAuthentication(
	db: ReturnType<typeof openDatabase>['db'],
	configuration: { baseURL?: string; secret?: string; trustedOrigins?: string } = {},
) {
	return betterAuth({
		// Better Auth otherwise skips origin checks when NODE_ENV is test.
		advanced: { disableOriginCheck: false, disableCSRFCheck: false },
		baseURL: configuration.baseURL,
		secret: configuration.secret,
		logger: {
			level: 'error',
			log: () => reportCaughtFailure('auth.request', 'authentication_error', randomUUID()),
		},
		database: drizzleAdapter(db, {
			provider: 'sqlite',
			schema: { ...authSchema, user: authSchema.users },
			usePlural: true,
		}),
		emailAndPassword: {
			enabled: true,
			disableSignUp: true, // Only allow sign-in, no registration
		},
		rateLimit: { enabled: true, storage: 'database', window: 10, max: 100 },
		trustedOrigins: getTrustedOrigins(
			configuration.trustedOrigins ?? process.env.BETTER_AUTH_TRUSTED_ORIGINS,
		),
		session: {
			cookieCache: {
				enabled: true,
				maxAge: 5 * 60, // 5 minutes - avoids DB hit on every getSession call
			},
		},
		plugins: [nextCookies()],
	});
}
