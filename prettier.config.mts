import type { Config } from 'prettier';

/**
 * Prettier — opinionated formatter for this Next.js 16 + React 19 + TypeScript + Tailwind repo.
 *
 * TypeScript configs need Node.js ≥22.6. On Node.js ≥24.3, Prettier runs without
 * `--experimental-strip-types` (see Prettier docs). This repo targets Node 24.x on hosting.
 *
 * @see https://prettier.io/docs/en/configuration.html
 * @see https://prettier.io/docs/en/configuration.html#typescript-configuration-files
 */
const config: Config = {
	semi: true,
	singleQuote: true,
	jsxSingleQuote: false,
	trailingComma: 'all',
	tabWidth: 4,
	useTabs: true,
	printWidth: 100,
	bracketSpacing: true,
	bracketSameLine: false,
	arrowParens: 'always',
	endOfLine: 'lf',
};

export default config;
