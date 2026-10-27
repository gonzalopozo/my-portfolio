import { describe, expect, it } from 'vitest';
import { isProjectImageUrl } from '@/lib/security/blob-ownership';

const origin = 'https://store.public.blob.vercel-storage.com';
describe('project image ownership', () => {
	it.each(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'])(
		'accepts managed %s images with and without a random suffix',
		(extension) => {
			for (const suffix of ['', '-random123']) {
				expect(
					isProjectImageUrl(`${origin}/og-images/7-123${suffix}.${extension}`, 7, origin),
				).toBe(true);
			}
		},
	);
	it.each([
		`${origin}/og-images/8-123.png`,
		`${origin}/og-images/70-123.png`,
		`${origin}/og-images/07-123.png`,
		`${origin}/other/7-123.png`,
		`${origin}/og-images/7-123-.png`,
		`${origin}/og-images/7-123-random-extra.png`,
		`${origin}/og-images/7-123.png/extra`,
		`${origin}/og-images/7-123.png?token=secret`,
		`${origin}/og-images/7-123.png#image`,
		'https://user:password@store.public.blob.vercel-storage.com/og-images/7-123.png',
		'https://other.public.blob.vercel-storage.com/og-images/7-123.png',
		'not-a-url',
		`${origin}/og-images/7-123.svg`,
	])('rejects an unowned or ambiguous object', (value) => {
		expect(isProjectImageUrl(value, 7, origin)).toBe(false);
	});
	it('fails closed without an owner or configured store', () => {
		expect(isProjectImageUrl(`${origin}/og-images/7-123.png`, undefined, origin)).toBe(false);
		expect(isProjectImageUrl(`${origin}/og-images/7-123.png`, 7, undefined)).toBe(false);
	});
	it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
		'rejects an invalid project ID: %s',
		(projectId) => {
			const value = `${origin}/og-images/7-123.png`;
			expect(isProjectImageUrl(value, projectId, origin)).toBe(false);
		},
	);
});
