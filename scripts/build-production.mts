import { productionHarness } from './production-harness.mjs';

process.env.APP_ENV = 'test';
process.env.PORTFOLIO_TEST_BUILD = 'true';
await productionHarness();
