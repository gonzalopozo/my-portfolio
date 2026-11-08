import { productionHarness } from './production-harness.mjs';

if (process.env.VERCEL || process.env.CIRCLECI || process.env.GITHUB_ACTIONS)
	throw new Error('Playwright is local only. Use ci:build for cloud production smoke checks.');
// Deterministic fixture guards use CI semantics inside this local test process.
process.env.CI = 'true';
await productionHarness(process.argv.slice(2));
