import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: 'node',
		include: ['tests/contract/**/*.test.ts'],
		fileParallelism: false,
		testTimeout: 30000,
		hookTimeout: 30000,
	},
});
