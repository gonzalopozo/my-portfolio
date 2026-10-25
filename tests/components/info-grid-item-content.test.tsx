import { cleanup, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InfoGridItemContent } from '@/components/public/info-grid-item-content';

vi.mock('@/components/public/use-portfolio-media', () => ({
	usePortfolioMedia: () => ({ isMobile: true, hasDragPointer: false }),
}));

afterEach(cleanup);

describe('mobile introduction', () => {
	it('keeps the portrait, complete introduction, status, and both actions available', () => {
		const status =
			'Looking for a thoughtful team building useful, accessible products together.';
		render(
			<NuqsTestingAdapter>
				<InfoGridItemContent
					infoAboutMe={{
						isEmployed: false,
						statusMessage: status,
						resumeUrl: 'https://example.com/cv.pdf',
					}}
				/>
			</NuqsTestingAdapter>,
		);
		expect(
			screen.getByRole('img', { name: 'Gonzalo Pozo, Full Stack Developer' }),
		).toBeTruthy();
		expect(screen.getByRole('status').textContent).toBe(status);
		expect(screen.getByText(/people building it\.$/)).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Download CV' }).getAttribute('href')).toBe(
			'https://example.com/cv.pdf',
		);
		expect(screen.getByRole('button', { name: 'About Me' })).toBeTruthy();
	});

	it('omits an unavailable CV and redundant section action in About me', () => {
		render(
			<NuqsTestingAdapter searchParams="?section=About+me">
				<InfoGridItemContent
					infoAboutMe={{ isEmployed: null, statusMessage: null, resumeUrl: '' }}
				/>
			</NuqsTestingAdapter>,
		);
		expect(screen.getByRole('status').textContent).toBe('Open to Work');
		expect(screen.queryByRole('link', { name: 'Download CV' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'About Me' })).toBeNull();
	});
});
