import { productionHarness } from './production-harness.mjs';

if (process.env.VERCEL || process.env.CIRCLECI || process.env.GITHUB_ACTIONS)
	throw new Error('Playwright is local only. Use ci:build for cloud production smoke checks.');
process.env.APP_ENV = 'test';
process.env.PORTFOLIO_TEST_BUILD = 'true';
await productionHarness(process.argv.slice(2));
