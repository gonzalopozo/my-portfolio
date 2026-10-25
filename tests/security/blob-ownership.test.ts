import { describe, expect, it } from 'vitest';
import { isProjectImageUrl } from '@/lib/security/blob-ownership';

const origin = 'https://store.public.blob.vercel-storage.com';
describe('project image ownership', () => {
	it('accepts only the managed path for the exact store and project', () => {
		expect(isProjectImageUrl(`${origin}/og-images/7-123-random.png`, 7, origin)).toBe(true);
	});
	it.each([
		`${origin}/og-images/8-123.png`,
		`${origin}/other/7-123.png`,
		`${origin}/og-images/7-123.png?token=secret`,
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
});
