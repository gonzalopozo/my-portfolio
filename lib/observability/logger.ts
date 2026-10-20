type Fields = {
	operation: string;
	classification?: string;
	durationMs?: number;
	requestId?: string;
	reference?: string;
	status?: number;
};

/** Callers supply classifications and opaque IDs, never Error objects or arbitrary data. */
export function logOperation(level: 'info' | 'warn' | 'error', fields: Fields) {
	const safe = (value: string | undefined) =>
		value?.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 100);
	const record = {
		timestamp: new Date().toISOString(),
		level,
		service: 'portfolio',
		environment: safe(process.env.APP_ENV ?? process.env.VERCEL_ENV ?? 'development'),
		release: /^[a-f0-9]{40}$/.test(process.env.NEXT_PUBLIC_RELEASE_SHA ?? '')
			? process.env.NEXT_PUBLIC_RELEASE_SHA
			: 'local',
		deployment: safe(process.env.VERCEL_DEPLOYMENT_ID),
		operation: safe(fields.operation),
		classification: safe(fields.classification),
		requestId: safe(fields.requestId),
		reference: safe(fields.reference),
		durationMs: fields.durationMs,
		status: fields.status,
	};
	console[level](JSON.stringify(record));
}
