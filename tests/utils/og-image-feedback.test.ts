import { describe, expect, it } from 'vitest';
import {
	clearOgImageWarningParams,
	getOgImageErrorMessage,
	getOgImageWarningRedirect,
	parseOgImageWarning,
	type ProjectImageFeedback,
} from '@/lib/og-image-feedback';

const feedback: ProjectImageFeedback = {
	projectId: 7,
	operation: 'create',
	error: {
		code: 'upload-failed',
		stage: 'upload',
		reference: '11111111-1111-4111-8111-111111111111',
	},
};

function warningParams() {
	return Object.fromEntries(
		new URL(getOgImageWarningRedirect(feedback), 'https://admin.example.com').searchParams,
	);
}

describe('OG image redirect feedback', () => {
	it('round-trips only safe metadata and uses the catalogue for messages', () => {
		expect(parseOgImageWarning(warningParams())).toEqual(feedback);
		expect(getOgImageErrorMessage('upload-failed')).toContain('almacenamiento');
		expect(getOgImageWarningRedirect()).toBe('/dashboard/projects');
	});

	it.each([
		['ogOperation', 'delete'],
		['ogProject', '-1'],
		['ogProject', '9007199254740992'],
		['ogCode', '__proto__'],
		['ogCode', 'secret upstream exception'],
		['ogStage', 'unknown'],
		['ogReference', '<script>alert(1)</script>'],
		['ogCode', ['upload-failed', 'timeout']],
		['ogProject', undefined],
	])('ignores malformed %s', (key, value) => {
		expect(parseOgImageWarning({ ...warningParams(), [key as string]: value })).toBeUndefined();
	});

	it('clears warning parameters while preserving unrelated navigation state', () => {
		const params = new URLSearchParams(warningParams());
		params.set('filter', 'active');
		clearOgImageWarningParams(params);
		expect(params.toString()).toBe('filter=active');
	});
});
