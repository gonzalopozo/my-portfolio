import { describe, expect, it } from 'vitest';
import { cn, formatDate } from '@/lib/utils';

describe('shared utilities', () => {
	it('combines conditional classes with Tailwind conflict resolution', () => {
		expect(cn('p-2', false && 'hidden', { 'font-bold': true }, 'p-4')).toBe('font-bold p-4');
	});
	it('formats Spanish dates and preserves invalid-date behavior', () => {
		expect(formatDate(new Date('2026-01-15T12:00:00Z'))).toMatch(
			/^15\s+ene\.?\s+(?:de\s+)?2026$/,
		);
		expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
	});
});
