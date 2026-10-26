import { cleanup, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExperienceGridItemContent } from '@/components/public/experience-grid-item-content';
import { PortfolioSectionProvider } from '@/components/public/portfolio-section-provider';
import type { ExperienceData } from '@/lib/types';

vi.mock('@/components/public/dynamic-icon', () => ({ DynamicIcon: () => null }));

const experience: ExperienceData = {
	id: 1,
	role: 'Frontend Engineer',
	company: 'Example Studio',
	description: 'Built accessible portfolio interfaces.',
	companyUrl: 'https://example.com',
	companyLogo: null,
	location: 'Madrid',
	startDate: new Date('2023-01-01'),
	endDate: null,
	order: 0,
	createdAt: new Date('2023-01-01'),
	updatedAt: new Date('2023-01-01'),
	experienceSkills: [{ skill: { id: 1, name: 'React', icon: null, customIconUrl: null } }],
};

afterEach(cleanup);

describe('experience card content', () => {
	it('renders the record, ongoing dates, company link, and related skills', () => {
		render(
			<NuqsTestingAdapter>
				<PortfolioSectionProvider>
					<ExperienceGridItemContent experience={experience} />
				</PortfolioSectionProvider>
			</NuqsTestingAdapter>,
		);
		expect(screen.getByRole('heading', { name: 'Frontend Engineer' })).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Example Studio' }).getAttribute('href')).toBe(
			'https://example.com/',
		);
		expect(screen.getByText('Jan 2023 – Present · Madrid')).toBeTruthy();
		expect(screen.getByText('React')).toBeTruthy();
		expect(screen.getByText(experience.description)).toBeTruthy();
	});

	it('omits missing metadata and keeps the description available in category views', () => {
		render(
			<NuqsTestingAdapter searchParams="?section=Experience">
				<PortfolioSectionProvider>
					<ExperienceGridItemContent
						experience={{
							...experience,
							startDate: null,
							endDate: null,
							location: null,
							companyUrl: null,
							experienceSkills: [],
						}}
					/>
				</PortfolioSectionProvider>
			</NuqsTestingAdapter>,
		);
		expect(screen.queryByRole('link')).toBeNull();
		expect(screen.queryByText(/Present/)).toBeNull();
		expect(screen.queryByRole('button', { name: 'View experience' })).toBeNull();
		expect(
			screen.getByRole('region', { name: 'Frontend Engineer at Example Studio' }).textContent,
		).toContain(experience.description);
	});
});
