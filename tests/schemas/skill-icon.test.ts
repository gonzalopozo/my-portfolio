import { describe, expect, it } from 'vitest';
import { getSkillIconFileError, MAX_SKILL_ICON_BYTES } from '@/lib/schemas/skill-icon';

describe('skill icon upload metadata', () => {
	it('accepts SVG extensions case-insensitively, including an absent browser MIME type', () => {
		expect(
			getSkillIconFileError({
				name: 'logo.SVG',
				type: 'image/svg+xml',
				size: MAX_SKILL_ICON_BYTES,
			}),
		).toBeNull();
		expect(getSkillIconFileError({ name: 'logo.svg', type: '', size: 1 })).toBeNull();
	});

	it.each([
		{ name: 'logo.svg.png', type: 'image/svg+xml', size: 1 },
		{ name: 'logo.svg', type: 'image/png', size: 1 },
		{ name: 'logo.svg', type: 'image/svg+xml', size: 0 },
		{ name: 'logo.svg', type: 'image/svg+xml', size: MAX_SKILL_ICON_BYTES + 1 },
	])('rejects incorrect extensions, MIME types and sizes: %s', (file) => {
		expect(getSkillIconFileError(file)).toEqual(expect.any(String));
	});
});
