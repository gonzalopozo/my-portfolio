import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const consumers = [
	{
		name: 'ESLint / micromatch',
		parents: ['eslint-config-next', '@next/eslint-plugin-next', 'fast-glob', 'micromatch'],
	},
	{ name: 'dependency-cruiser', parents: ['dependency-cruiser'] },
	{ name: 'Vitest', parents: ['vitest'] },
];

// Keep adversarial matching outside the test worker: an unapplied patch must fail
// within the child deadline instead of blocking the entire verification process.
const regression = String.raw`
const assert = require('node:assert/strict');
const picomatch = require(process.argv[1]);
const risky = [
  '+(*)', '*(*)', '+(*a)', '*(a*)', '+(*a|b)', '+(@(*a))',
  'prefix+(*a)suffix',
];
const options = [
  {}, { fastpaths: false }, { capture: true }, { bash: true },
  { regex: true }, { maxExtglobRecursion: false },
];
for (const option of options) {
  for (const pattern of risky) {
    const matches = picomatch(pattern, option);
    assert.equal(matches('a'.repeat(64) + '/!'), false, pattern);
    assert.equal(matches(pattern), true, pattern + ' must use the literal fallback');
  }
}
for (const [input, pattern] of [
  ['aaa', '+(a)'],
  ['ababa', '+(a|b)'],
  ['ab', '+([ab])'],
  ['*', '+([*])'],
  ['*', '+(\\*)'],
  ['*', '+("*")'],
  ['aaa', '+(*(a))'],
  ['file.ts', '*.{ts,tsx}'],
  ['src/file.ts', '**/*.ts'],
]) {
  assert.equal(picomatch.isMatch(input, pattern), true, pattern);
}
`;

describe('picomatch repeated wildcard protection', () => {
	it.each(consumers)('protects the installed copy used by $name', ({ parents }) => {
		let requireFrom = createRequire(import.meta.url);
		for (const [index, parent] of parents.entries()) {
			// Some direct tools expose only an ESM entrypoint; nested consumers use require.
			const resolved =
				index === 0 ? import.meta.resolve(parent) : requireFrom.resolve(parent);
			requireFrom = createRequire(resolved);
		}
		const entrypoint = requireFrom.resolve('picomatch');
		const result = spawnSync(process.execPath, ['-e', regression, entrypoint], {
			encoding: 'utf8',
			timeout: 2_000,
			maxBuffer: 64 * 1024,
		});
		expect(result.error).toBeUndefined();
		expect(result.signal).toBeNull();
		expect(result.stderr).toBe('');
		expect(result.status).toBe(0);
	});
});
