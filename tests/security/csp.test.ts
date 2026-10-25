// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildCsp, getAdminCspPolicy, getCspHeaderName, getCspMode } from '@/lib/security/csp';

const blobHostname = 'https://images.public.blob.vercel-storage.com';
const options = { isDevelopment: false, blobHostname, mode: 'report-only' as const };

describe('CSP security boundaries', () => {
	it('defaults to observation and rejects unknown rollout modes', () => {
		expect(getCspHeaderName(getCspMode(undefined))).toBe('Content-Security-Policy-Report-Only');
		expect(getCspHeaderName(getCspMode('enforce'))).toBe('Content-Security-Policy');
		expect(() => getCspMode('disabled')).toThrow();
	});
	it('keeps production scripts free of eval and unrestricted external sources', () => {
		const policy = buildCsp({ ...options, section: 'public' });
		expect(policy).not.toContain('unsafe-eval');
		expect(policy).not.toMatch(/(?:^|\s)https:(?:\s|;)/);
		expect(policy).toContain("script-src-attr 'none'");
		expect(policy).toContain("frame-ancestors 'none'");
		expect(policy).toContain(blobHostname);
		expect(policy).not.toContain('nonce-');
	});
	it('allows map resources only on public documents', () => {
		const admin = buildCsp({ ...options, section: 'admin' });
		const publicPolicy = buildCsp({ ...options, section: 'public' });
		expect(admin).not.toContain('cartocdn.com');
		expect(admin).toContain("worker-src 'none'");
		expect(publicPolicy).toContain('https://tiles-d.basemaps.cartocdn.com');
		expect(publicPolicy).toContain("worker-src 'self' blob:");
	});
	it.each(['preview', 'production'] as const)(
		'accepts administrative nonce configuration on %s deployments',
		(environment) => {
			expect(getAdminCspPolicy('nonce', environment)).toBe('nonce');
		},
	);
	it('defaults to static and rejects unknown policies or unsupported nonce environments', () => {
		expect(getAdminCspPolicy(undefined, 'production')).toBe('static');
		expect(getAdminCspPolicy('static', undefined)).toBe('static');
		expect(() => getAdminCspPolicy('disabled', 'production')).toThrow();
		expect(() => getAdminCspPolicy('nonce', undefined)).toThrow();
		expect(() => getAdminCspPolicy('nonce', 'development')).toThrow();
	});
	it('limits nonce scripts to administrative documents', () => {
		const nonce = 'a'.repeat(43) + '=';
		const policy = buildCsp({ ...options, section: 'admin', nonce });
		const scriptPolicy = policy
			.split(';')
			.map((directive) => directive.trim())
			.find((directive) => directive.startsWith('script-src '));
		expect(scriptPolicy).toBeDefined();
		expect(scriptPolicy).not.toContain('unsafe-inline');
		expect(policy).toContain(`'nonce-${nonce}' 'strict-dynamic'`);
		expect(() => buildCsp({ ...options, section: 'public', nonce })).toThrow();
		expect(() =>
			buildCsp({ ...options, section: 'admin', nonce: "'; script-src *" }),
		).toThrow();
	});
	it('rejects malformed or unrelated Blob origins instead of injecting policy text', () => {
		for (const value of [
			'http://images.public.blob.vercel-storage.com',
			'https://example.com',
			`${blobHostname}/path`,
			`${blobHostname}/?x=1`,
		]) {
			expect(() =>
				buildCsp({ ...options, section: 'public', blobHostname: value }),
			).toThrow();
		}
	});
	it('confines debugging and insecure local connections to development', () => {
		const development = buildCsp({ section: 'admin', mode: 'enforce', isDevelopment: true });
		expect(development).toContain('unsafe-eval');
		expect(development).toContain('ws://localhost:*');
		expect(development).not.toContain('upgrade-insecure-requests');
	});
	it.each(['public', 'admin'] as const)(
		'upgrades insecure requests only under enforcement outside development: %s',
		(section) => {
			for (const mode of ['report-only', 'enforce'] as const) {
				for (const isDevelopment of [true, false]) {
					const policy = buildCsp({ section, mode, isDevelopment });
					expect(policy.includes('upgrade-insecure-requests')).toBe(
						mode === 'enforce' && !isDevelopment,
					);
				}
			}
		},
	);
});
