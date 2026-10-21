import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';
import { buildCsp, getCspHeaderName, getCspMode } from './lib/security/csp';
import { getBlobPublicHostname } from './lib/blob-environment';

const nextConfig: NextConfig = {
	env: {
		NEXT_PUBLIC_RELEASE_SHA:
			process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local',
	},
	reactCompiler: true,
	cacheComponents: true,
	partialPrefetching: true,
	async headers() {
		const mode = getCspMode(process.env.CSP_PUBLIC_MODE);
		const policy = buildCsp({
			section: 'public',
			mode,
			isDevelopment: process.env.NODE_ENV === 'development',
			blobHostname: getBlobPublicHostname(),
		});
		return [
			{
				source: '/:path*',
				headers: [
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'X-Frame-Options', value: 'DENY' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{
						key: 'Permissions-Policy',
						value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
					},
					...(process.env.NODE_ENV === 'production'
						? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
						: []),
				],
			},
			{
				// Admin CSP belongs to proxy.ts. APIs/assets are not document policy targets.
				source: '/:path((?!login(?:/|$)|dashboard(?:/|$)|api(?:/|$)|_next(?:/|$)).*)',
				headers: [{ key: getCspHeaderName(mode), value: policy }],
			},
		];
	},

	experimental: {
		turbopackFileSystemCacheForDev: true,
		turbopackFileSystemCacheForBuild: false,
		optimizePackageImports: ['lucide-react', 'react-icons', '@radix-ui/react-icons'],
	},
	images: {
		remotePatterns: [
			new URL(`${getBlobPublicHostname()}/**`),
			new URL('https://lastfm.freetls.fastly.net/**'),
			new URL('https://image-cdn-**.spotifycdn.com/**'),
			new URL('https://i.scdn.co/**'),
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: '**.mzstatic.com',
				pathname: '/**',
			},
		],
	},
};

const uploadSourceMaps = process.env.VERCEL_ENV === 'production' && process.env.VERCEL === '1';
if (
	uploadSourceMaps &&
	(!process.env.SENTRY_AUTH_TOKEN || !process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT)
) {
	throw new Error('Production builds require Sentry source map upload configuration.');
}
if (
	uploadSourceMaps &&
	(!process.env.SENTRY_DSN ||
		process.env.SENTRY_DSN !== process.env.NEXT_PUBLIC_SENTRY_DSN ||
		process.env.APP_ENV !== 'production' ||
		process.env.NEXT_PUBLIC_APP_ENV !== 'production')
) {
	throw new Error(
		'Production builds require matching server/browser Sentry DSNs and production environment tags.',
	);
}
export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	authToken: uploadSourceMaps ? process.env.SENTRY_AUTH_TOKEN : undefined,
	silent: true,
	errorHandler: () => {
		throw new Error('Sentry source map upload failed.');
	},
	sourcemaps: { disable: !uploadSourceMaps, deleteSourcemapsAfterUpload: true },
});
