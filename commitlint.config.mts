/**
 * commitlint — Conventional Commits for this repo (matches your history: feat/fix/build/docs/perf/style).
 *
 * `.mts` is supported by @commitlint/load (cosmiconfig + TypeScriptLoader).
 *
 * @see https://commitlint.js.org/
 * @see https://commitlint.js.org/guides/getting-started.html
 * @see https://www.conventionalcommits.org/
 */
import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'header-max-length': [2, 'always', 140],
	},
	// Git merge/revert commits are not Conventional Commits; allow them so hooks do not block pulls/merges.
	ignores: [
		(message) => /^Merge\b/m.test(message),
		(message) => /^Revert\s/m.test(message.trim()),
	],
};

export default config;
