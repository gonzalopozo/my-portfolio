import { afterAll, afterEach, beforeAll, expect } from 'vitest';
import type { HttpHandler } from 'msw/http';
import { createNetworkServer } from './network-server';

/** Opt in per suite so unrelated mocks and remote contracts keep their own lifecycle. */
export function setupNetwork(...handlers: HttpHandler[]) {
	const unexpectedRequests: string[] = [];
	const server = createNetworkServer(handlers, (destination) => {
		unexpectedRequests.push(destination);
	});
	beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
	afterEach(() => {
		try {
			expect(unexpectedRequests, 'Unexpected network requests').toEqual([]);
		} finally {
			unexpectedRequests.length = 0;
			server.resetHandlers();
		}
	});
	afterAll(() => server.close());
	return server;
}
