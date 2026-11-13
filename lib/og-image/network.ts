import 'server-only';
import { Resolver } from 'node:dns/promises';
import { request, type RequestOptions } from 'node:https';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { type ImageBudget, OgImageOperationError } from './budget';
import { isInvalidIpV4, isInvalidIpV6 } from './ip-policy';

interface Address {
	address: string;
	family: number;
}

function missingRecords(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		['ENODATA', 'ENOTFOUND', 'ESOCKETNODATA'].includes(String(error.code))
	);
}

export async function resolvePublicAddresses(url: URL, budget: ImageBudget): Promise<Address[]> {
	const hostname = url.hostname.replace(/^\[|\]$/g, '');
	const family = isIP(hostname);
	let addresses: Address[];
	if (family) {
		addresses = [{ address: hostname, family }];
	} else {
		const resolver = new Resolver({ timeout: 1000, tries: 1 });
		try {
			addresses = await budget.run(2000, async (signal) => {
				const cancel = () => resolver.cancel();
				signal.addEventListener('abort', cancel, { once: true });
				try {
					const resolve = async (version: 4 | 6) => {
						try {
							const values = await (version === 4
								? resolver.resolve4(hostname)
								: resolver.resolve6(hostname));
							return values.map((address) => ({ address, family: version }));
						} catch (error) {
							if (missingRecords(error)) return [];
							throw new OgImageOperationError('dns-failed');
						}
					};
					return (await Promise.all([resolve(4), resolve(6)])).flat();
				} finally {
					signal.removeEventListener('abort', cancel);
					resolver.cancel();
				}
			});
		} catch (error) {
			if (error instanceof OgImageOperationError) throw error;
			throw new OgImageOperationError('dns-failed');
		}
	}
	if (!addresses.length) throw new OgImageOperationError('dns-failed');
	if (
		addresses.some(({ address, family }) =>
			family === 4 ? isInvalidIpV4(address) : isInvalidIpV6(address),
		)
	) {
		throw new OgImageOperationError('blocked-url');
	}
	return addresses;
}

/** Socket fallbacks use this fixed set; neither DNS nor a pooled socket can bypass policy. */
export function pinnedLookup(addresses: Address[]): NonNullable<RequestOptions['lookup']> {
	return (_hostname, options, callback) => {
		const matching = addresses.filter(
			(value) => !options.family || value.family === options.family,
		);
		if (!matching.length) return callback(new Error('No validated address'), '', 0);
		if (options.all) callback(null, matching);
		else callback(null, matching[0].address, matching[0].family);
	};
}

async function fetchPinned(url: URL, addresses: Address[], signal: AbortSignal): Promise<Response> {
	// The same strict isolation gate as Blob fixtures; DNS policy has already run.
	if (
		process.env.CI === 'true' &&
		process.env.APP_ENV === 'test' &&
		!process.env.VERCEL &&
		process.env.TEST_FIXTURE_DIRECTORY
	) {
		const { ogImageFixture } = await import('../../tests/fixtures/og-image');
		return ogImageFixture(url);
	}
	return new Promise((resolve, reject) => {
		// HTTPS forwards this socket option, although its request type omits it.
		const options: RequestOptions & { autoSelectFamily: boolean } = {
			agent: false,
			lookup: pinnedLookup(addresses),
			autoSelectFamily: true,
			signal,
			headers: { 'accept-encoding': 'identity' },
		};
		const req = request(url, options, (incoming) => {
			const headers = new Headers();
			for (const [name, value] of Object.entries(incoming.headers)) {
				if (value !== undefined)
					headers.set(name, Array.isArray(value) ? value.join(', ') : value);
			}
			const status = incoming.statusCode ?? 502;
			if (status === 204 || status === 304) {
				incoming.resume();
				resolve(new Response(null, { status, headers }));
			} else {
				resolve(
					new Response(Readable.toWeb(incoming) as ReadableStream<Uint8Array>, {
						status,
						headers,
					}),
				);
			}
		});
		req.once('error', reject);
		req.end();
	});
}

const MAX_BYTES = 5 * 1024 * 1024;

export async function downloadSource(
	url: URL,
	addresses: Address[],
	allowedTypes: readonly string[],
	budget: ImageBudget,
	onBody: () => void,
): Promise<Buffer> {
	try {
		return await budget.run(5000, async (signal) => {
			const response = await fetchPinned(url, addresses, signal);
			const reader = response.body?.getReader();
			try {
				if (response.status >= 300 && response.status < 400) {
					throw new OgImageOperationError('request-failed');
				}
				if (!response.ok) throw new OgImageOperationError('http-failed', response.status);
				const type = response.headers
					.get('content-type')
					?.split(';')[0]
					.trim()
					.toLowerCase();
				if (!type || !allowedTypes.includes(type)) {
					throw new OgImageOperationError('invalid-content-type');
				}
				const encoding = response.headers.get('content-encoding');
				if (encoding && encoding !== 'identity')
					throw new OgImageOperationError('request-failed');
				onBody();
				if (Number(response.headers.get('content-length')) > MAX_BYTES) {
					throw new OgImageOperationError('too-large');
				}
				const chunks: Uint8Array[] = [];
				let size = 0;
				while (reader) {
					const { done, value } = await reader.read();
					if (done) break;
					size += value.byteLength;
					if (size > MAX_BYTES) throw new OgImageOperationError('too-large');
					chunks.push(value);
				}
				return Buffer.concat(chunks, size);
			} finally {
				void reader?.cancel().catch(() => {});
			}
		});
	} catch (error) {
		if (error instanceof OgImageOperationError) throw error;
		throw new OgImageOperationError('request-failed');
	}
}
