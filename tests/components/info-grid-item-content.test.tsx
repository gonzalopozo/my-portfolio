import { cleanup, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { InfoGridItemContent } from '@/components/public/info-grid-item-content';
import { PortfolioSectionProvider } from '@/components/public/portfolio-section-provider';

afterEach(cleanup);

describe('responsive introduction content', () => {
	it('keeps the portrait, complete introduction, status, and both actions available', () => {
		const status =
			'Looking for a thoughtful team building useful, accessible products together.';
		render(
			<NuqsTestingAdapter>
				<PortfolioSectionProvider>
					<InfoGridItemContent
						infoAboutMe={{
							isEmployed: false,
							statusMessage: status,
							resumeUrl: 'https://example.com/cv.pdf',
						}}
					/>
				</PortfolioSectionProvider>
			</NuqsTestingAdapter>,
		);
		expect(
			screen.getAllByRole('img', { name: 'Gonzalo Pozo, Full Stack Developer' }),
		).toHaveLength(2);
		for (const badge of screen.getAllByRole('status')) expect(badge.textContent).toBe(status);
		expect(screen.getAllByText(/people building it\.$/)).toHaveLength(2);
		for (const link of screen.getAllByRole('link', { name: 'Download CV' }))
			expect(link.getAttribute('href')).toBe('https://example.com/cv.pdf');
		expect(screen.getAllByRole('button', { name: 'About Me' })).toHaveLength(2);
	});

	it('omits an unavailable CV and redundant section action in About me', () => {
		render(
			<NuqsTestingAdapter searchParams="?section=About+me">
				<PortfolioSectionProvider>
					<InfoGridItemContent
						infoAboutMe={{ isEmployed: null, statusMessage: null, resumeUrl: '' }}
					/>
				</PortfolioSectionProvider>
			</NuqsTestingAdapter>,
		);
		for (const badge of screen.getAllByRole('status'))
			expect(badge.textContent).toBe('Open to Work');
		expect(screen.queryByRole('link', { name: 'Download CV' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'About Me' })).toBeNull();
	});
});
