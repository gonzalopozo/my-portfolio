import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { reportMusicIssues } from '@/lib/music-diagnostics';

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => undefined);
	vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe('safe music logs', () => {
	it('logs only allowlisted fields even if a caller supplies raw details', () => {
		const issue = {
			integration: 'lastfm' as const,
			operation: 'request' as const,
			code: 'network-error' as const,
			requestUrl: 'https://provider/?api_key=secret',
			cause: new Error('secret provider details'),
		};
		const correlationId = '00000000-0000-0000-0000-000000000000';
		reportMusicIssues([issue], correlationId);
		expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toMatchObject({
			operation: 'music.lastfm.request',
			reference: correlationId,
			classification: 'network-error',
		});
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
	});

	it('logs optional Spotify failures as warnings and drops invalid numeric metadata', () => {
		reportMusicIssues(
			[
				{
					integration: 'spotify-artwork',
					operation: 'request',
					code: 'http-error',
					httpStatus: Number.NaN,
					apiCode: Number.POSITIVE_INFINITY,
				},
			],
			'00000000-0000-0000-0000-000000000000',
		);
		expect(console.error).not.toHaveBeenCalled();
		expect(console.warn).toHaveBeenCalledOnce();
		const event = JSON.parse(vi.mocked(console.warn).mock.calls[0][0]);
		expect(event).not.toHaveProperty('httpStatus');
		expect(event).not.toHaveProperty('apiCode');
	});
});
