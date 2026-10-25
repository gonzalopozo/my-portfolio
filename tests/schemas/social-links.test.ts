import { describe, expect, it } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { skills, socialLinks } from '@/db/schema/portfolio';
import { socialLinkSchema } from '@/lib/schemas/social-links';

const validLink = {
	name: 'GitHub',
	url: 'https://github.com/example',
	icon: '',
	color: '#66696d',
};

describe('socialLinkSchema', () => {
	it('maps persisted colors and existing skill options to their Turso columns', () => {
		expect(getTableColumns(socialLinks).color.name).toBe('background_color');
		expect(getTableColumns(skills).useColor.name).toBe('use_color');
		expect(getTableColumns(skills).customColor.name).toBe('custom_color');
	});

	it('normalizes a valid color to six-digit lowercase hex', () => {
		expect(socialLinkSchema.parse({ ...validLink, color: '#A1B2C3' }).color).toBe('#a1b2c3');
	});

	it.each(['', '#fff', '#00000000', 'red', 'javascript:alert(1)', null])(
		'rejects an invalid or missing color: %s',
		(color) => {
			expect(socialLinkSchema.safeParse({ ...validLink, color }).success).toBe(false);
		},
	);

	it('accepts an empty optional URL', () => {
		expect(socialLinkSchema.safeParse({ ...validLink, url: '' }).success).toBe(true);
	});
});
