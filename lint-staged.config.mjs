/**
 * lint-staged — ESLint + Prettier + CSpell on staged files (fast pre-commit via Husky).
 *
 * Order for code: `eslint --fix` → `prettier --write` → `cspell lint` (read-only; after format).
 * Prose/config text: Prettier then CSpell.
 *
 * JSON is Prettier-only: avoids noisy spell hits on lockfiles, manifests, and generated JSON
 * (large blobs are already in `cspell.json` `ignorePaths`; skipping cspell on `*.json` keeps commits fast).
 *
 * @see https://github.com/lint-staged/lint-staged
 * @see https://cspell.org/docs/getting-started
 * @see https://nextjs.org/docs/app/api-reference/config/eslint
 */
const cspellStaged = 'cspell lint --config cspell.json --no-progress --cache --no-must-find-files';

const config = {
	'*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}': ['eslint --fix', 'prettier --write', cspellStaged],
	'*.{md,mdx,css,scss,html,yml,yaml}': ['prettier --write', cspellStaged],
	'*.json': 'prettier --write',
};

export default config;
