import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { logOperation } from './logger';

/** Use bounded operation names; returned values and thrown messages are never telemetry. */
export async function observeOperation<T>(operation: string, task: () => Promise<T>): Promise<T> {
	const started = performance.now();
	let failed = false;
	try {
		if (
			process.env.CI === 'true' &&
			process.env.APP_ENV === 'test' &&
			!process.env.VERCEL &&
			process.env.TEST_FIXTURE_DIRECTORY
		) {
			const { beforeQuery } = await import('../../tests/fixtures/query');
			await beforeQuery(operation);
		}
		return await Sentry.startSpan({ name: operation, op: 'app.operation' }, task);
	} catch (error) {
		failed = true;
		const publicMessages = new Set([
			'Project not found.',
			'Experience not found.',
			'Settings not found.',
			'Invalid project position.',
			'No se encontró el enlace.',
			'La posición está fuera de la lista.',
		]);
		if (error instanceof Error && publicMessages.has(error.message))
			throw new Error(error.message);
		// Drizzle errors may contain SQL parameters. Never let the framework log the raw error.
		throw new Error('The database operation could not be completed.');
	} finally {
		const durationMs = performance.now() - started;
		logOperation(failed ? 'error' : 'info', {
			operation,
			classification: failed ? 'operation_failed' : 'success',
			durationMs,
		});
		Sentry.metrics.distribution('app.operation.duration', durationMs, {
			unit: 'millisecond',
			attributes: { operation, outcome: failed ? 'failure' : 'success' },
		});
	}
}
