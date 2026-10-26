import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import vitest from '@vitest/eslint-plugin';
import globals from 'globals';

/**
 * Tailored ESLint flat config for this Next.js 16 + React 19 + TypeScript app.
 *
 * Loaded via jiti (see devDependency). TypeScript variant: `eslint.config.mts`.
 *
 * Base: eslint-config-next (Core Web Vitals + Next + React + hooks + jsx-a11y + import) + typescript-eslint recommended.
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @see https://nextjs.org/docs/app/api-reference/config/eslint
 */
export default defineConfig([
	// Next includes the recommended React Hooks rules, including React Compiler diagnostics.
	...nextVitals,
	...nextTs,

	// Lightweight TS style rules (no type-aware project service — keeps lint fast).
	{
		name: 'portfolio/typescript-import-style',
		files: ['**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
		},
	},

	// Stricter console usage in UI routes/components (server modules may log intentionally).
	{
		name: 'portfolio/no-console-app',
		files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
		rules: {
			'no-console': ['warn', { allow: ['warn', 'error'] }],
		},
	},

	// Tailwind class linting/order for JSX and common class composition helpers (`cn`, `clsx`, `cva`, etc.).
	{
		...betterTailwindcss.configs.recommended,
		name: 'portfolio/better-tailwindcss',
		files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
		settings: {
			'better-tailwindcss': {
				entryPoint: './app/globals.css',
				detectComponentClasses: true,
				rootFontSize: 16,
			},
		},
		rules: {
			...betterTailwindcss.configs.recommended.rules,
			'better-tailwindcss/enforce-consistent-line-wrapping': [
				'warn',
				{
					classesPerLine: 0,
					preferSingleLine: true,
					printWidth: 0,
				},
			],
			'better-tailwindcss/no-unknown-classes': [
				'error',
				{
					ignore: ['^toaster$', 'portfolio-grid-entering'],
				},
			],
		},
	},

	// Vitest — unit/integration tests under Vitest (not Playwright e2e).
	{
		...vitest.configs.recommended,
		name: 'portfolio/vitest',
		files: ['**/*.{test,spec}.{ts,tsx,js,jsx,mts,mjs}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
		languageOptions: {
			globals: {
				...vitest.configs.env.languageOptions.globals,
			},
		},
	},

	// Node: one-off scripts and repo config files.
	{
		name: 'portfolio/node-globals',
		files: [
			'scripts/**/*.{mts,ts,cjs,mjs}',
			'*.{config,setup}.{ts,mts,mjs,js,cjs}',
			'postcss.config.*',
			'eslint.config.mts',
		],
		languageOptions: {
			globals: {
				...globals.nodeBuiltin,
				...globals.node,
			},
		},
	},

	// Turn off ESL<int rules that conflict with Prettier (formatting). Must stay near the end.
	eslintConfigPrettier,

	globalIgnores([
		'.next/**',
		'.ci/**',
		'.tmp/**',
		'.specstory/**',
		'.claude/**',
		'.agents/**',
		'out/**',
		'build/**',
		'coverage/**',
		'playwright-report/**',
		'test-results/**',
		'node_modules/**',
		'.pnpm-store/**',
		'next-env.d.ts',
		'**/*.min.js',
		'public/**',
	]),
]);
