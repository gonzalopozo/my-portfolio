import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const config = {
	turbopack: { root: fileURLToPath(new URL('../../', import.meta.url)) },
	cacheComponents: true,
	partialPrefetching: true,
	reactCompiler: true,
	images: { unoptimized: true },
	experimental: { cpus: 1 },
};

export default config;
