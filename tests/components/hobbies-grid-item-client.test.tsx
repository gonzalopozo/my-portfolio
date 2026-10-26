import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HobbiesGridItemClient } from '@/components/public/hobbies-grid-item-client';
import { PortfolioSectionProvider } from '@/components/public/portfolio-section-provider';

const media = vi.hoisted(() => ({ hasDragPointer: true }));
vi.mock('@/components/public/use-portfolio-media', () => ({ usePortfolioMedia: () => media }));

afterEach(() => {
	cleanup();
});

function setup() {
	const onUrlUpdate = vi.fn();
	render(
		<NuqsTestingAdapter hasMemory onUrlUpdate={onUrlUpdate}>
			<PortfolioSectionProvider>
				<HobbiesGridItemClient
					hobbies={['NBA', 'Cars', 'Watches', 'Startups', 'Training', 'Reading'].map(
						(name) => ({
							id: name,
							name,
							icon: <span aria-hidden="true">Icon</span>,
							lightThemeImage: '/hobbies/cars_dark.png',
							darkThemeImage: '/hobbies/cars_light.png',
						}),
					)}
				/>
			</PortfolioSectionProvider>
		</NuqsTestingAdapter>,
	);
	return onUrlUpdate;
}

describe('HobbiesGridItemClient', () => {
	it('previews a hobby without navigating', () => {
		const onUrlUpdate = setup();
		const preview = screen.getByRole('button', { name: 'Preview NBA' });

		fireEvent.click(preview);
		expect(preview.getAttribute('aria-pressed')).toBe('true');
		expect(onUrlUpdate).not.toHaveBeenCalled();

		fireEvent.click(preview);
		expect(preview.getAttribute('aria-pressed')).toBe('false');
	});

	it.each([0, 1])('opens the About me section from arrow presentation %i', async (index) => {
		const onUrlUpdate = setup();
		const arrow = screen.getAllByRole('button', {
			name: 'Show About me section from Cars',
		})[index];

		fireEvent.click(arrow);

		await waitFor(() =>
			expect(onUrlUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					queryString: '?section=About+me',
					options: expect.objectContaining({ history: 'push', scroll: false }),
				}),
			),
		);
	});
});
