import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const excluded = [
	...configDefaults.exclude,
	'e2e/**',
	'tests/contract/**',
	'.specstory/**',
	'.agents/**',
	'.claude/**',
	'.ci/**',
	'.next/**',
];
export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'node',
					include: ['**/*.test.{ts,tsx}'],
					exclude: [
						...excluded,
						'tests/components/**',
						'components/**',
						'app/**',
						'tests/integration/**',
					],
				},
			},
			{
				extends: true,
				test: {
					name: 'component',
					environment: 'jsdom',
					setupFiles: ['./tests/setup-component.ts'],
					include: [
						'tests/components/**/*.test.{ts,tsx}',
						'components/**/*.test.{ts,tsx}',
						'app/**/*.test.{ts,tsx}',
					],
					exclude: excluded,
				},
			},
			{
				extends: true,
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/integration/**/*.test.ts'],
					exclude: excluded,
				},
			},
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov', 'json-summary'],
			include: ['lib/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'db/client.ts'],
			exclude: [
				'**/*.test.*',
				'lib/types.d.ts',
				'components/ui/**',
				'lib/react-icons-manifest.json',
			],
			thresholds: {
				'lib/security/**': { lines: 90, statements: 90, functions: 90, branches: 85 },
				'lib/schemas/**': { lines: 90, statements: 90, functions: 90, branches: 85 },
				'lib/actions/**': { lines: 85, statements: 85, functions: 85, branches: 80 },
				'lib/admin.ts': { lines: 90, statements: 90, functions: 90, branches: 85 },
			},
		},
	},
});
