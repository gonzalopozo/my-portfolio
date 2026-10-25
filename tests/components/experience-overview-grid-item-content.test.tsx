import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExperienceOverviewGridItemContent } from '@/components/public/experience-overview-grid-item-content';

vi.mock('@/components/public/dynamic-icon', () => ({
	DynamicIcon: ({ iconFullName, className }: { iconFullName: string; className: string }) => (
		<span data-icon-name={iconFullName} className={className} />
	),
}));
vi.mock('@/components/public/grid-item-show-more-button', () => ({
	GridItemShowMoreButton: () => <button>View experience</button>,
}));

afterEach(cleanup);

describe('experience overview marquee', () => {
	it('leaves the track out when no used skill has an icon', () => {
		const { container } = render(<ExperienceOverviewGridItemContent skills={[]} />);
		expect(container.querySelector('.animate-tech-marquee')).toBeNull();
		expect(container.firstElementChild?.className).toContain('grid-rows-[1fr_auto]');
	});

	it('fills the loop and exposes one accessible link per skill', () => {
		const { container } = render(
			<ExperienceOverviewGridItemContent
				skills={[
					{
						id: 1,
						name: 'React',
						icon: 'SiReact|si',
						customIconUrl: null,
						url: 'https://react.dev',
						useColor: true,
						customColor: '#61dafb',
						usageCount: 1,
					},
				]}
			/>,
		);
		const icons = container.querySelectorAll('[data-icon-name]');
		expect(icons).toHaveLength(20);
		const link = screen.getByRole('link', {
			name: 'Explore React',
		});
		expect(link.getAttribute('href')).toBe('https://react.dev/');
		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('noopener noreferrer');
		expect(link.hasAttribute('title')).toBe(false);
		expect(container.querySelectorAll('a[tabindex="-1"]')).toHaveLength(19);
		fireEvent.focus(link);
		expect(screen.getByRole('tooltip').textContent).toContain('Explore React');
	});

	it('keeps disabled colors muted across the repeated sequence', () => {
		const skills = [
			{
				id: 1,
				name: 'React',
				icon: 'SiReact|si',
				customIconUrl: null,
				url: 'javascript:alert(1)',
				useColor: true,
				customColor: '#61dafb',
				usageCount: 2,
			},
			{
				id: 2,
				name: 'TypeScript',
				icon: 'SiTypescript|si',
				customIconUrl: null,
				url: null,
				useColor: false,
				customColor: '#3178c6',
				usageCount: 1,
			},
		];
		const { container } = render(<ExperienceOverviewGridItemContent skills={skills} />);
		const icons = container.querySelectorAll('[data-icon-name]');
		expect(icons).toHaveLength(20);
		expect(icons[1].className).toBe('size-7.5');
		expect(container.querySelector('[data-tech-marquee-track]')).toBeTruthy();
		expect(container.querySelectorAll('[data-tech-marquee-item]')).toHaveLength(20);
		expect(container.querySelectorAll('a')).toHaveLength(0);
	});
});
