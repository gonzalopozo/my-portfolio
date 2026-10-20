import 'server-only';
import { captureMessage } from '@sentry/nextjs';
import { logOperation } from './logger';

/** Returned failure states do not reach onRequestError; report one classified event. */
export function reportCaughtFailure(operation: string, classification: string, reference: string) {
	logOperation('error', { operation, classification, reference });
	captureMessage('Application operation failed', {
		level: 'error',
		fingerprint: [operation, classification],
		tags: { operation, classification, reference },
	});
}
