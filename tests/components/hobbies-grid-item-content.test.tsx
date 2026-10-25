import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HobbiesGridItemContent } from '@/components/public/hobbies-grid-item-content';

const media = vi.hoisted(() => ({ isMobile: false, hasDragPointer: true }));
vi.mock('@/components/public/use-portfolio-media', () => ({ usePortfolioMedia: () => media }));

afterEach(() => {
	cleanup();
	media.isMobile = false;
});

function setup() {
	const onUrlUpdate = vi.fn();
	render(
		<NuqsTestingAdapter hasMemory onUrlUpdate={onUrlUpdate}>
			<HobbiesGridItemContent />
		</NuqsTestingAdapter>,
	);
	return onUrlUpdate;
}

describe('HobbiesGridItemContent', () => {
	it('previews a hobby without navigating', () => {
		const onUrlUpdate = setup();
		const preview = screen.getByRole('button', { name: 'Preview NBA' });

		fireEvent.click(preview);
		expect(preview.getAttribute('aria-pressed')).toBe('true');
		expect(onUrlUpdate).not.toHaveBeenCalled();

		fireEvent.click(preview);
		expect(preview.getAttribute('aria-pressed')).toBe('false');
	});

	it('opens the About me section from an arrow control', async () => {
		const onUrlUpdate = setup();
		const arrow = screen.getByRole('button', {
			name: 'Show About me section from Cars',
		});

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

	it('shows all six mobile hobbies and navigates through their visible arrows', async () => {
		media.isMobile = true;
		const onUrlUpdate = setup();
		for (const name of ['NBA', 'Cars', 'Watches', 'Startups', 'Training', 'Reading']) {
			expect(screen.getByText(name)).toBeTruthy();
		}
		expect(screen.queryByRole('button', { name: /Preview/ })).toBeNull();
		expect(screen.queryByText('Beyond the code')).toBeNull();
		expect(screen.queryByText("A few things I'm into.")).toBeNull();
		expect(screen.getAllByRole('button', { name: /section from/ })).toHaveLength(6);
		expect(screen.queryByRole('button', { name: 'About Me' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Show About me section from Cars' }));
		await waitFor(() =>
			expect(onUrlUpdate).toHaveBeenCalledWith(
				expect.objectContaining({ queryString: '?section=About+me' }),
			),
		);
		expect(screen.getAllByRole('button', { name: /section from/ })).toHaveLength(6);
	});
});
