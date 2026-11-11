import type { NextConfig } from 'next';
import { buildCsp, getCspHeaderName, getCspMode } from './lib/security/csp';
import { getBlobPublicHostname } from './lib/blob-environment';

const isIsolatedProductionBuild =
	process.env.PORTFOLIO_TEST_BUILD === 'true' &&
	process.env.CI === 'true' &&
	process.env.APP_ENV === 'test';

const nextConfig: NextConfig = {
	distDir: isIsolatedProductionBuild ? '.ci/next-production' : '.next',
	env: {
		NEXT_PUBLIC_RELEASE_SHA:
			process.env.VERCEL_GIT_COMMIT_SHA ??
			process.env.RELEASE_SHA ??
			process.env.CIRCLE_SHA1 ??
			'local',
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
		// The isolated harness omits CircleCI metadata; host CPU discovery can over-allocate workers.
		...(isIsolatedProductionBuild ? { cpus: 1 } : {}),
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

export default nextConfig;
