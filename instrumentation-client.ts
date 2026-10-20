import * as Sentry from '@sentry/nextjs';
import { privacyOptions, sentryDsn } from './lib/observability/privacy';

Sentry.init({
	...privacyOptions,
	dsn: sentryDsn(process.env.NEXT_PUBLIC_SENTRY_DSN),
	enabled:
		Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && process.env.NEXT_PUBLIC_APP_ENV !== 'test',
	environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
	release: process.env.NEXT_PUBLIC_RELEASE_SHA,
	tracesSampleRate: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.1 : 0,
	// The public useReportWebVitals collector is the single field metrics source.
	integrations: [Sentry.webVitalsIntegration({ ignore: ['cls', 'inp', 'lcp'] })],
	beforeSend(event) {
		// Server request errors are captured once by onRequestError, using their digest.
		if (event.exception?.values?.some((value) => value.value?.includes('digest:'))) return null;
		return privacyOptions.beforeSend(event);
	},
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
