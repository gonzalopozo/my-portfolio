import { describe, expect, it, vi } from 'vitest';
import { privacyOptions, routeName, scrubEvent, sentryDsn } from '@/lib/observability/privacy';
import { logOperation } from '@/lib/observability/logger';

describe('telemetry privacy', () => {
	it('drops SDK log records before transmission', () => {
		expect(privacyOptions.beforeSendLog()).toBeNull();
	});
	it('validates the public ingest DSN without echoing malformed private configuration', () => {
		const dsn = `https://${'1'.repeat(32)}@o1.ingest.us.sentry.io/1`;
		expect(sentryDsn(dsn)).toBe(dsn);
		expect(sentryDsn(undefined)).toBeUndefined();
		expect(() => sentryDsn('private-token')).toThrow('valid HTTPS ingest DSN');
		expect(() => sentryDsn('private-token')).not.toThrow('private-token');
		expect(() => sentryDsn(`https://${'1'.repeat(32)}@attacker.invalid/1`)).toThrow();
	});
	it('removes bodies, identities, raw messages and breadcrumbs', () => {
		const event = scrubEvent({
			user: { email: 'private@example.test' },
			extra: { token: 'private-token' },
			message: 'private-token',
			request: {
				url: 'https://site.test/dashboard/projects/123/edit?token=private-token',
				data: 'private-token',
				headers: { cookie: 'private-token' },
			},
			breadcrumbs: [{ message: 'private-token' }],
			exception: { values: [{ type: 'Error', value: 'private-token' }] },
		});
		expect(JSON.stringify(event)).not.toContain('private-');
		expect(event.request?.url).toBe('/dashboard/projects/[id]/edit');
	});
	it('drops private span attributes and preserves bounded operation names', () => {
		const span = privacyOptions.beforeSendSpan({
			name: 'db.projects.read',
			trace_id: 'trace',
			span_id: 'span',
			start_timestamp: 0,
			status: 'ok',
			is_segment: false,
			attributes: { 'db.query.text': 'private-token' },
		});
		expect(span.name).toBe('db.projects.read');
		expect(span.attributes).toEqual({});
	});
	it('normalizes route labels without query values', () => {
		expect(routeName('https://site.test/dashboard/projects/42/edit?secret=value')).toBe(
			'/dashboard/projects/[id]/edit',
		);
	});
	it('uses an allowlist even when arbitrary fields reach the logging boundary', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const fields = {
				operation: 'db.projects.read',
				classification: 'failure',
				password: 'private-token',
			};
			logOperation('error', fields);
			expect(spy).toHaveBeenCalledOnce();
			expect(JSON.stringify(spy.mock.calls)).not.toContain('private-token');
		} finally {
			spy.mockRestore();
		}
	});
});
