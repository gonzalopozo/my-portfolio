import 'server-only';
import { unstable_rethrow } from 'next/navigation';
import type { MusicIntegration, MusicIssue, MusicResult } from '@/lib/music-status';

export type MusicFetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

/** The deadline covers reading the response body as well as receiving its headers. */
export async function fetchMusicJson(
	input: URL,
	integration: MusicIntegration,
	fetcher: MusicFetcher = fetch,
): Promise<MusicResult<unknown>> {
	const signal = AbortSignal.timeout(5_000);
	let operation: MusicIssue['operation'] = 'request';
	try {
		const response = await fetcher(input, { signal, cache: 'no-store' });
		if (!response.ok) {
			return {
				status: 'failed',
				data: null,
				issues: [
					{ integration, operation, code: 'http-error', httpStatus: response.status },
				],
			};
		}
		operation = 'parse';
		return { status: 'success', data: await response.json(), issues: [] };
	} catch (error) {
		unstable_rethrow(error);
		const timedOut =
			signal.aborted || (error instanceof Error && error.name === 'TimeoutError');
		return {
			status: 'failed',
			data: null,
			issues: [
				{
					integration,
					operation,
					code: timedOut
						? 'timeout'
						: operation === 'parse'
							? 'invalid-json'
							: 'network-error',
				},
			],
		};
	}
}
