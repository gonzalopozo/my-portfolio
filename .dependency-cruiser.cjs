/**
 * dependency-cruiser — validate imports and architecture for this Next.js 16 (App Router) repo.
 *
 * @see https://github.com/sverweij/dependency-cruiser
 * @see https://www.npmjs.com/package/dependency-cruiser
 *
 * Run: `pnpm depcruise`
 * Graph (needs Graphviz `dot`): `pnpm depcruise:graph`
 */
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	extends: ['dependency-cruiser/configs/recommended.cjs'],

	forbidden: [
		// -----------------------------------------------------------------
		// Override bundled `no-orphans`: App Router pages/layouts/API routes are
		// entry points resolved by Next, not by explicit imports from other TS files.
		// -----------------------------------------------------------------
		{
			name: 'no-orphans',
			comment:
				'Orphan module — likely unused. Exceptions: Next.js app/ tree, middleware/proxy, CLI scripts, e2e, config files.',
			severity: 'warn',
			from: {
				orphan: true,
				pathNot: [
					String.raw`(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$`,
					String.raw`[.]d[.](?:c|m)?ts$`,
					String.raw`(^|/)tsconfig[.]json$`,
					String.raw`(^|/)(?:babel|webpack|next|postcss|vitest|playwright|eslint|commitlint|prettier|lint-staged|tailwind)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$`,
					String.raw`(^|/)knip[.]jsonc$`,
					String.raw`(^|/)cspell[.]json$`,
					String.raw`(^|/)app/`,
					String.raw`(^|/)e2e/`,
					String.raw`(^|/)scripts/`,
					String.raw`^proxy[.]ts$`,
					String.raw`^instrumentation[.]ts$`,
					String.raw`(^|/)next-env[.]d[.]ts$`,
				],
			},
			to: {},
		},

		// -----------------------------------------------------------------
		// Layering (matches AGENTS.md: lib → data/auth; app/components → UI & routes)
		// -----------------------------------------------------------------
		{
			name: 'lib-not-to-app',
			comment:
				'lib/ must not import from app/ — keeps server logic independent of route files.',
			severity: 'error',
			from: { path: '^lib/' },
			to: { path: '^app/' },
		},
		{
			name: 'lib-not-to-components',
			comment:
				'lib/ must not import from components/ — avoid coupling data layer to React UI.',
			severity: 'error',
			from: { path: '^lib/' },
			to: { path: '^components/' },
		},
		{
			name: 'db-not-to-app-or-components',
			comment:
				'db/ must not import from app/ or components/ — schema and DB client stay infrastructure-only.',
			severity: 'error',
			from: { path: '^db/' },
			to: { path: '^(app|components)/' },
		},
		{
			name: 'components-not-to-db',
			comment:
				'components/ must not import db/ — use lib/queries or server actions from route/page instead.',
			severity: 'error',
			from: { path: '^components/' },
			to: { path: '^db/' },
		},
		{
			name: 'public-not-to-admin-components',
			comment: 'Public portfolio UI must not depend on admin-only components.',
			severity: 'error',
			from: { path: '^components/public/' },
			to: { path: '^components/admin/' },
		},
		{
			name: 'public-icons-use-server-resolver',
			comment:
				'Resolve public icons through the server-only DynamicIcon component and pass SVG nodes into interactive clients.',
			severity: 'error',
			from: {
				path: '^components/public/',
				pathNot: '^components/public/dynamic-icon[.]tsx$',
			},
			to: { path: '(^|/)react-icons(/|$)|^lib/react-icons-manifest[.]json$' },
		},

		// -----------------------------------------------------------------
		// Merge with recommended `not-to-unresolvable`: some npm packages use
		// export maps / conditions that enhanced-resolve does not map to a single
		// on-disk file the same way TypeScript + Next do. TS still validates these.
		// -----------------------------------------------------------------
		{
			name: 'not-to-unresolvable',
			comment:
				'Unresolved import — add the package or fix the path. Exceptions: known export-map-heavy deps (better-auth, nuqs).',
			severity: 'error',
			from: {},
			to: {
				couldNotResolve: true,
				pathNot: [String.raw`^better-auth/`, String.raw`^nuqs(?:/|$)`],
			},
		},
	],

	options: {
		// Faster resolution for a typical TS + ESM/CJS Next app
		moduleSystems: ['cjs', 'es6'],
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'require', 'node', 'default'],
		},

		tsConfig: {
			fileName: 'tsconfig.json',
		},
	},
};
