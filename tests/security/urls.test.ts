import { describe, expect, it } from 'vitest';
import { safeWebUrl } from '@/lib/security/urls';
import { getTrustedOrigins } from '@/lib/security/trusted-origins';
import { optionalWebUrlSchema } from '@/lib/schemas/common';

describe('untrusted URLs', () => {
	it.each([
		'javascript:alert(1)',
		'data:text/html,<script/>',
		'vbscript:example',
		'//example.com',
		'/login',
		'https://user:password@example.com',
		'https://example.com/\npath',
	])('disables unsafe rendered link %s', (value) => {
		expect(safeWebUrl(value)).toBeUndefined();
		expect(optionalWebUrlSchema.safeParse(value).success).toBe(false);
	});
	it('preserves normal web links and optional empty input', () => {
		expect(safeWebUrl('https://example.com/page?q=1')).toBe('https://example.com/page?q=1');
		expect(safeWebUrl('http://example.com')).toBe('http://example.com/');
		expect(optionalWebUrlSchema.safeParse('').success).toBe(true);
	});
	it('uses explicit trusted origins and rejects wildcards and insecure remote origins', () => {
		expect(getTrustedOrigins('https://preview.vercel.app, http://localhost:3000')).toContain(
			'https://preview.vercel.app',
		);
		for (const value of [
			'https://*.vercel.app',
			'http://preview.vercel.app',
			'https://example.com/path',
			'https://user:pass@example.com',
		]) {
			expect(() => getTrustedOrigins(value)).toThrow();
		}
	});
	it('names the configuration entry when an ID or token is used instead of an origin', () => {
		const token = 'accidentally-pasted-token';
		expect(() => getTrustedOrigins(token)).toThrow(
			'Invalid BETTER_AUTH_TRUSTED_ORIGINS entry 1.',
		);
		expect(() => getTrustedOrigins(`http://localhost:3000,${token}`)).toThrow(
			'Invalid BETTER_AUTH_TRUSTED_ORIGINS entry 2.',
		);
		expect(() => getTrustedOrigins(token)).not.toThrow(token);
	});
	it.each(['http://localhost:3000,', 'http://localhost:3000,,https://preview.vercel.app'])(
		'rejects empty configured origins without granting additional trust: %s',
		(value) => {
			expect(() => getTrustedOrigins(value)).toThrow(
				'Invalid BETTER_AUTH_TRUSTED_ORIGINS entry 2.',
			);
		},
	);
});
