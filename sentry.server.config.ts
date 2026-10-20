import * as Sentry from '@sentry/nextjs';
import { privacyOptions, sentryDsn } from './lib/observability/privacy';

Sentry.init({
	...privacyOptions,
	dsn: sentryDsn(process.env.SENTRY_DSN),
	enabled: Boolean(process.env.SENTRY_DSN) && process.env.APP_ENV !== 'test',
	environment: process.env.APP_ENV ?? process.env.VERCEL_ENV ?? 'development',
	release: process.env.NEXT_PUBLIC_RELEASE_SHA,
	tracesSampleRate: process.env.APP_ENV === 'production' ? 0.1 : 0,
	initialScope: { tags: { deployment: process.env.VERCEL_DEPLOYMENT_ID ?? 'local' } },
});
