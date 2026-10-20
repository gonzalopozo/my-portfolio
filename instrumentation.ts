import type { Instrumentation } from 'next';

export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		await import('./sentry.server.config');
		if (process.env.CI === 'true' && process.env.APP_ENV === 'test' && !process.env.VERCEL) {
			await import('./tests/fixtures/network');
		}
	}
}

export const onRequestError: Instrumentation.onRequestError = async (...arguments_) => {
	const Sentry = await import('@sentry/nextjs');
	Sentry.captureRequestError(...arguments_);
};
