import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { RequestOptions } from 'node:https';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	resolve4: vi.fn(),
	resolve6: vi.fn(),
	cancel: vi.fn(),
	request: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('node:dns/promises', () => ({
	Resolver: class {
		resolve4 = mocks.resolve4;
		resolve6 = mocks.resolve6;
		cancel = mocks.cancel;
	},
}));
vi.mock('node:https', () => ({ request: mocks.request }));
import { downloadSource, pinnedLookup, resolvePublicAddresses } from '@/lib/og-image/network';
import { ImageBudget } from '@/lib/og-image/budget';

const destination = new URL('https://example.com/image.png');
const addresses = [
	{ address: '93.184.216.34', family: 4 },
	{ address: '2606:4700:4700::1111', family: 6 },
];
function respond(
	chunks: Buffer[],
	statusCode = 200,
	headers: Record<string, string> = { 'content-type': 'image/png' },
) {
	mocks.request.mockImplementation(
		(_url: URL, options: RequestOptions, callback: (response: IncomingMessage) => void) => {
			const incoming = Object.assign(Readable.from(chunks), {
				headers,
				statusCode,
			}) as unknown as IncomingMessage;
			const req = Object.assign(new EventEmitter(), { end: () => callback(incoming) });
			options.signal?.addEventListener(
				'abort',
				() => incoming.destroy(new Error('aborted')),
				{ once: true },
			);
			return req;
		},
	);
}
beforeEach(() => {
	vi.resetAllMocks();
	mocks.resolve4.mockResolvedValue([addresses[0].address]);
	mocks.resolve6.mockResolvedValue([addresses[1].address]);
	vi.stubEnv('TEST_FIXTURE_DIRECTORY', undefined);
	respond([Buffer.from('image')]);
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.useRealTimers();
});
const download = () =>
	downloadSource(destination, addresses, ['image/png'], new ImageBudget(), () => {});

describe('public destination policy and pinned connections', () => {
	it('pins both families without another DNS resolution or pooled connection', async () => {
		const checked = await resolvePublicAddresses(destination, new ImageBudget());
		await downloadSource(destination, checked, ['image/png'], new ImageBudget(), () => {});
		const options = mocks.request.mock.calls[0][1] as RequestOptions;
		const callback = vi.fn();
		options.lookup!('example.com', { all: true }, callback);
		expect(callback).toHaveBeenCalledWith(null, addresses);
		expect(options.agent).toBe(false);
		expect(mocks.request.mock.calls[0][0].hostname).toBe('example.com');
		expect(mocks.resolve4).toHaveBeenCalledTimes(1);
		expect(mocks.resolve6).toHaveBeenCalledTimes(1);
	});
	it('does not consult changed DNS answers during fallback', async () => {
		const checked = await resolvePublicAddresses(destination, new ImageBudget());
		mocks.resolve4.mockResolvedValue(['127.0.0.1']);
		const callback = vi.fn();
		pinnedLookup(checked)('example.com', { all: true }, callback);
		expect(callback).toHaveBeenCalledWith(null, addresses);
	});
	it.each(['127.0.0.1', '10.0.0.1', '169.254.169.254'])(
		'rejects a mixed public/private answer containing %s',
		async (ip) => {
			mocks.resolve4.mockResolvedValue([addresses[0].address, ip]);
			await expect(
				resolvePublicAddresses(destination, new ImageBudget()),
			).rejects.toMatchObject({ code: 'blocked-url' });
			expect(mocks.request).not.toHaveBeenCalled();
		},
	);
	it('supports IPv6-only origins and rejects private literals', async () => {
		mocks.resolve4.mockRejectedValue({ code: 'ENODATA' });
		expect(await resolvePublicAddresses(destination, new ImageBudget())).toEqual([
			addresses[1],
		]);
		await expect(
			resolvePublicAddresses(new URL('https://[::1]'), new ImageBudget()),
		).rejects.toMatchObject({ code: 'blocked-url' });
	});
	it('cancels stalled DNS within two seconds', async () => {
		vi.useFakeTimers();
		mocks.resolve4.mockReturnValue(new Promise(() => {}));
		const pending = resolvePublicAddresses(destination, new ImageBudget());
		void pending.catch(() => {});
		await vi.advanceTimersByTimeAsync(2000);
		await expect(pending).rejects.toMatchObject({ code: 'timeout' });
		expect(mocks.cancel).toHaveBeenCalled();
	});
	it.each([302, 307])('rejects redirect %s without following it', async (status) => {
		respond([], status);
		await expect(download()).rejects.toMatchObject({ code: 'request-failed' });
		expect(mocks.request).toHaveBeenCalledTimes(1);
	});
	it('classifies HTTP errors without exposing response bodies', async () => {
		respond([Buffer.from('private upstream body')], 503);
		await expect(download()).rejects.toMatchObject({ code: 'http-failed', httpStatus: 503 });
	});
	it('enforces MIME and advertised/streamed byte limits', async () => {
		respond([], 200, { 'content-type': 'text/plain' });
		await expect(download()).rejects.toMatchObject({ code: 'invalid-content-type' });
		respond([], 200, { 'content-type': 'image/png', 'content-length': '5242881' });
		await expect(download()).rejects.toMatchObject({ code: 'too-large' });
		respond([Buffer.alloc(5 * 1024 * 1024 + 1)]);
		await expect(download()).rejects.toMatchObject({ code: 'too-large' });
	});
	it('cancels a response body that stalls after headers', async () => {
		vi.useFakeTimers();
		mocks.request.mockImplementation(
			(_url: URL, options: RequestOptions, callback: (response: IncomingMessage) => void) => {
				const incoming = Object.assign(new Readable({ read() {} }), {
					headers: { 'content-type': 'image/png' },
					statusCode: 200,
				}) as unknown as IncomingMessage;
				options.signal?.addEventListener(
					'abort',
					() => incoming.destroy(new Error('aborted')),
					{ once: true },
				);
				return Object.assign(new EventEmitter(), { end: () => callback(incoming) });
			},
		);
		const pending = download();
		void pending.catch(() => {});
		await vi.advanceTimersByTimeAsync(5000);
		await expect(pending).rejects.toMatchObject({ code: 'timeout' });
	});
});
