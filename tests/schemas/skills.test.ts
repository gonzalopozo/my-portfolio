import { describe, expect, it } from 'vitest';
import { skillSchema } from '@/lib/schemas/skills';

const validSkill = {
	name: 'React',
	type: 'frontend' as const,
	icon: 'SiReact|si',
	url: '',
	useColor: false,
	customColor: null,
};

describe('skillSchema', () => {
	it('requires a valid HEX color only when color is enabled', () => {
		expect(skillSchema.safeParse(validSkill).success).toBe(true);
		expect(skillSchema.safeParse({ ...validSkill, useColor: true }).success).toBe(false);
		expect(
			skillSchema.safeParse({ ...validSkill, useColor: true, customColor: 'red' }).success,
		).toBe(false);
		expect(
			skillSchema.safeParse({ ...validSkill, useColor: true, customColor: '#A1B2C3' }).data,
		).toMatchObject({ customColor: '#a1b2c3' });
	});
});
