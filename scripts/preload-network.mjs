import { isInternalThread } from 'node:worker_threads';

// Node's loader thread must not register another TypeScript loader recursively.
if (!isInternalThread) {
	await import('tsx');
	const { startFixtureNetwork } = await import('../tests/fixtures/network.ts');
	startFixtureNetwork();
}
