import next from 'next';
import { createServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve(process.env.TEST_FIXTURE_DIRECTORY ?? '');
if (
	process.env.CI !== 'true' ||
	process.env.APP_ENV !== 'test' ||
	process.env.VERCEL ||
	!directory.startsWith(`${resolve('.ci')}/database-`)
)
	throw new Error('HTTPS harness requires isolated production test fixtures.');

// Next's cache handlers mix wall-clock and performance epoch timestamps. Keep those
// epochs aligned in this synthetic process when the host clock steps (for example NTP).
const wallNow = Date.now.bind(Date);
const monotonicNow = performance.now.bind(performance);
Object.defineProperty(performance, 'timeOrigin', {
	configurable: true,
	get: () => wallNow() - monotonicNow(),
});
// Same isolated production output, with the real TLS origin supplied to Next's request adapter.
const application = next({ dev: false, hostname: 'localhost', port: 3443 });
await application.prepare();
const handler = application.getRequestHandler();
const server = createServer(
	{ key: await readFile(`${directory}/key.pem`), cert: await readFile(`${directory}/cert.pem`) },
	(request, response) => {
		request.headers['x-forwarded-proto'] = 'https';
		void handler(request, response).catch(() => {
			response.statusCode = 500;
			response.end('Internal Server Error');
		});
	},
);
server.listen(3443, 'localhost');

async function close() {
	server.closeAllConnections();
	server.close();
	await application.close();
}
process.once('SIGTERM', () => {
	void close();
});
process.once('SIGINT', () => {
	void close();
});
