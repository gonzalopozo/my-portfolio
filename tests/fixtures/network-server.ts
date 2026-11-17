import { http, HttpResponse, type HttpHandler } from 'msw/http';
import { setupServer } from 'msw/node';

/** Record failures separately because application fallbacks can catch request errors. */
export function createNetworkServer(
	handlers: HttpHandler[],
	reportUnexpected: (destination: string) => void,
) {
	const server = setupServer(
		...handlers,
		http.all('*', ({ request }) => {
			reportUnexpected(`${request.method} ${new URL(request.url).origin}`);
			return HttpResponse.error();
		}),
	);
	server.events.on('unhandledException', ({ request }) => {
		reportUnexpected(`Handler failed: ${request.method} ${new URL(request.url).origin}`);
	});
	return server;
}
