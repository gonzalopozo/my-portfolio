// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fetchMusicJson } from '@/lib/music-request';

afterEach(() => vi.restoreAllMocks());

describe('music request deadline', () => {
	it('uses a five-second abort signal and bypasses nested fetch caching', async () => {
		const timeout = vi.spyOn(AbortSignal, 'timeout');
		const fetcher = vi.fn(async () => new Response('{}'));
		await fetchMusicJson(
			new URL('https://open.spotify.com/oembed'),
			'spotify-artwork',
			fetcher,
		);
		expect(timeout).toHaveBeenCalledWith(5_000);
		expect(fetcher).toHaveBeenCalledWith(expect.any(URL), {
			signal: expect.any(AbortSignal),
			cache: 'no-store',
		});
	});

	it('reports timeouts while waiting for headers', async () => {
		const error = new Error('upstream detail');
		error.name = 'TimeoutError';
		const result = await fetchMusicJson(
			new URL('https://open.spotify.com/oembed'),
			'spotify-artwork',
			vi.fn().mockRejectedValue(error),
		);
		expect(result.status).toBe('failed');
		expect(result.issues[0].code).toBe('timeout');
	});

	it('keeps the abort deadline active while consuming the response body', async () => {
		const controller = new AbortController();
		vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
		const response = new Response('{}');
		vi.spyOn(response, 'json').mockImplementation(async () => {
			controller.abort();
			throw new Error('sensitive upstream body');
		});
		const result = await fetchMusicJson(
			new URL('https://open.spotify.com/oembed'),
			'spotify-artwork',
			async () => response,
		);
		expect(result.issues[0]).toMatchObject({ operation: 'parse', code: 'timeout' });
		expect(JSON.stringify(result)).not.toContain('sensitive upstream body');
	});
});
