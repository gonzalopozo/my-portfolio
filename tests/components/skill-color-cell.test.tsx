import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SkillColorCell } from '@/components/admin/skill-color-cell';

afterEach(() => {
	cleanup();
});

describe('SkillColorCell', () => {
	it('renders a muted hint when the skill has no color', () => {
		render(<SkillColorCell color={null} />);

		expect(screen.getByText('Sin color')).toBeTruthy();
		expect(screen.queryByRole('img')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('renders the swatch and hex code for a custom color', () => {
		render(<SkillColorCell color="#61dafb" />);

		const swatch = screen.getByRole('img', { name: 'Color #61dafb' });
		expect(swatch).toBeTruthy();
		expect(swatch.style.backgroundColor).toBe('rgb(97, 218, 251)');
		expect(screen.getByText('#61dafb')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('flags the default color with an informative tooltip on focus', async () => {
		render(<SkillColorCell color="#66696d" />);

		const trigger = screen.getByRole('button', { name: 'Color por defecto' });
		expect(trigger).toBeTruthy();

		fireEvent.focus(trigger);
		expect(await screen.findByRole('tooltip')).toBeTruthy();
		expect(screen.getByText('Esta skill usa el color por defecto')).toBeTruthy();
	});
});
