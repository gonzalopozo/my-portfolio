import { sentryDsn } from '../observability/privacy';

type CspMode = 'report-only' | 'enforce';

/** Keep static as the fallback and allow nonces on Preview and Production deployments. */
export function getAdminCspPolicy(value: string | undefined, environment: string | undefined) {
	if (!value || value === 'static') return 'static';
	if (value === 'nonce' && (environment === 'preview' || environment === 'production')) {
		return 'nonce';
	}
	throw new Error('CSP_ADMIN_POLICY supports static, or nonce in Vercel Preview and Production.');
}

const CARTO_ORIGINS = [
	'https://basemaps.cartocdn.com',
	'https://tiles.basemaps.cartocdn.com',
	'https://tiles-a.basemaps.cartocdn.com',
	'https://tiles-b.basemaps.cartocdn.com',
	'https://tiles-c.basemaps.cartocdn.com',
	'https://tiles-d.basemaps.cartocdn.com',
];

/** Keep rollout configuration server-side and reject accidental policy changes. */
export function getCspMode(value: string | undefined): CspMode {
	if (value === undefined || value === '' || value === 'report-only') return 'report-only';
	if (value === 'enforce') return 'enforce';
	throw new Error('CSP mode must be report-only or enforce.');
}

export function getCspHeaderName(mode: CspMode) {
	return mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
}

/** This store origin is also used by the image optimizer; never interpolate raw env text. */
function getBlobOrigin(value: string | undefined): string | undefined {
	if (!value) return undefined;
	const url = new URL(value);
	if (
		url.protocol !== 'https:' ||
		!url.hostname.endsWith('.public.blob.vercel-storage.com') ||
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== '/'
	) {
		throw new Error('The configured Blob hostname must be an HTTPS public Blob store origin.');
	}
	return url.origin;
}

/**
 * Stable policies preserve Cache Components and prerendered framework scripts.
 * Inline scripts/styles are a documented compatibility compromise, not strict XSS protection.
 */
export function buildCsp({
	section,
	mode,
	isDevelopment,
	blobHostname,
	nonce,
}: {
	section: 'public' | 'admin';
	mode: CspMode;
	isDevelopment: boolean;
	blobHostname?: string;
	nonce?: string;
}): string {
	const isPublic = section === 'public';
	if (nonce && (isPublic || !/^[A-Za-z0-9+/]{22,}={0,2}$/.test(nonce))) {
		throw new Error('CSP nonces are only supported for administrative documents.');
	}
	const blobOrigin = getBlobOrigin(blobHostname);
	const sentryOrigin = getSentryOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);

	const directives = [
		"default-src 'self'",
		`script-src 'self' ${nonce ? `'nonce-${nonce}' 'strict-dynamic'` : "'unsafe-inline'"}${isDevelopment ? " 'unsafe-eval'" : ''}`,
		"script-src-attr 'none'",
		// Sonner injects nonce-free style elements; React/Motion/Radix also use style attributes.
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' data:${isPublic ? ' blob:' : ''}${blobOrigin ? ` ${blobOrigin}` : ''}`,
		"font-src 'self'",
		`connect-src 'self'${sentryOrigin ? ` ${sentryOrigin}` : ''}${isPublic ? ` ${CARTO_ORIGINS.join(' ')}` : ''}${
			isDevelopment ? ' ws://localhost:* ws://127.0.0.1:*' : ''
		}`,
		`worker-src ${isPublic ? "'self' blob:" : "'none'"}`,
		// Fallback for browsers without worker-src. frame-src remains independently blocked.
		`child-src ${isPublic ? "'self' blob:" : "'none'"}`,
		"media-src 'none'",
		"frame-src 'none'",
		"object-src 'none'",
		"base-uri 'none'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	];
	// Browsers ignore this directive in report-only policies and warn on every response.
	if (!isDevelopment && mode === 'enforce') directives.push('upgrade-insecure-requests');
	return `${directives.join('; ')};`;
}

/** Permit only the configured Sentry ingest host, never arbitrary HTTPS endpoints. */
function getSentryOrigin(value: string | undefined) {
	const dsn = sentryDsn(value);
	return dsn ? new URL(dsn).origin : undefined;
}
