import 'server-only';
import { logOperation } from './logger';

/** Log returned failure states with a classification and opaque support reference. */
export function reportCaughtFailure(operation: string, classification: string, reference: string) {
	logOperation('error', { operation, classification, reference });
}
