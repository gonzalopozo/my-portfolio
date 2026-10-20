import type { Event, init } from '@sentry/nextjs';

/** Validate configuration without allowing parser errors to echo a pasted credential. */
export function sentryDsn(value: string | undefined) {
	if (!value) return undefined;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error('Sentry requires a valid HTTPS ingest DSN.');
	}
	if (
		url.protocol !== 'https:' ||
		!/^[a-z0-9.-]+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(url.hostname) ||
		!/^[a-f0-9]{32}$/i.test(url.username) ||
		!/^\/[0-9]+$/.test(url.pathname) ||
		url.password ||
		url.port ||
		url.search ||
		url.hash
	)
		throw new Error('Sentry requires a valid HTTPS ingest DSN.');
	return value;
}

export function routeName(value: string) {
	try {
		const path = new URL(value, 'https://local.invalid').pathname;
		if (path.startsWith('/api/auth/')) return '/api/auth/[operation]';
		if (
			!/^(?:\/|\/login|\/dashboard(?:\/(?:projects|experiences|skills|social-links)(?:\/(?:new|[0-9]+\/edit))?|\/(?:settings|music-status))?|\/api\/(?:health|ready))$/.test(
				path,
			)
		)
			return '/unknown';
		return path.replace(/\/\d+(?=\/|$)/g, '/[id]').slice(0, 160);
	} catch {
		return '/unknown';
	}
}

/** Keep stack identity for grouping, never raw messages, records, request bodies or cookies. */
export function scrubEvent<T extends Event>(event: T): T {
	delete event.user;
	delete event.extra;
	delete event.breadcrumbs;
	const route = event.request?.url ? routeName(event.request.url) : undefined;
	if (event.request)
		event.request = {
			url: route,
			method: /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(event.request.method ?? '')
				? event.request.method
				: undefined,
		};
	if (event.message) event.message = 'Application error';
	for (const exception of event.exception?.values ?? []) {
		exception.value = 'Application error';
		if (exception.mechanism) delete exception.mechanism.data;
		for (const frame of exception.stacktrace?.frames ?? []) delete frame.vars;
	}
	if (event.transaction)
		event.transaction = routeName(
			event.transaction.replace(/^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /, ''),
		);
	if (event.tags)
		event.tags = Object.fromEntries(
			Object.entries(event.tags).filter(
				([key, value]) =>
					['operation', 'classification', 'reference', 'deployment'].includes(key) &&
					/^[A-Za-z0-9_.:-]{1,100}$/.test(String(value)),
			),
		);
	if (route) event.tags = { ...event.tags, route };
	if (event.contexts)
		event.contexts = event.contexts.trace ? { trace: event.contexts.trace } : {};
	return event;
}

export const privacyOptions = {
	dataCollection: {
		userInfo: false,
		cookies: false,
		httpHeaders: false,
		httpBodies: [],
		urlQueryParams: false,
		databaseQueryData: false,
		stackFrameVariables: false,
		frameContextLines: 0,
		graphQL: { document: false, variables: false },
		genAI: { inputs: false, outputs: false },
		queues: false,
	},
	beforeSendLog: () => null,
	beforeSend: scrubEvent,
	beforeSendSpan: (span) => ({
		...span,
		name: /^(?:db|cms|database)\.[a-z_.-]+$/.test(span.name)
			? span.name
			: /^(?:GET|POST|PUT|DELETE|PATCH) \//.test(span.name)
				? `${span.name.split(' ')[0]} ${routeName(span.name.slice(span.name.indexOf(' ') + 1))}`
				: 'operation',
		attributes: {},
		links: undefined,
	}),
} satisfies Partial<Parameters<typeof init>[0]>;
