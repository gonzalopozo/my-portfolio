import { act, cleanup, render, screen } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, describe, expect, it } from 'vitest';
import {
	PortfolioSectionProvider,
	usePortfolioSection,
} from '@/components/public/portfolio-section-provider';

function SectionStatus() {
	const { section } = usePortfolioSection();
	return <p role="status">{section ?? 'All'}</p>;
}

function content(searchParams: string) {
	return (
		<NuqsTestingAdapter searchParams={searchParams} hasMemory>
			<PortfolioSectionProvider>
				<SectionStatus />
			</PortfolioSectionProvider>
		</NuqsTestingAdapter>
	);
}

function restoreHistory(search: string) {
	act(() => {
		window.history.replaceState(null, '', `/${search}`);
		window.dispatchEvent(new PopStateEvent('popstate'));
	});
}

afterEach(() => {
	cleanup();
	window.history.replaceState(null, '', '/');
});

describe('portfolio section history', () => {
	it.each([
		{ initial: 'Experience', next: '?section=Projects', expected: 'Projects' },
		{ initial: 'Projects', next: '?section=Experience', expected: 'Experience' },
		{ initial: 'Experience', next: '', expected: 'All' },
		{ initial: 'Experience', next: '?section=unknown', expected: 'All' },
	])(
		'restores $expected from $next before the query adapter catches up',
		({ initial, next, expected }) => {
			window.history.replaceState(null, '', `/?section=${initial}`);
			render(content(`?section=${initial}`));
			expect(screen.getByRole('status')).toHaveTextContent(initial);

			restoreHistory(next);

			expect(screen.getByRole('status')).toHaveTextContent(expected);
		},
	);

	it('ignores an outdated query-adapter update after restoring history', () => {
		window.history.replaceState(null, '', '/?section=Experience');
		const view = render(content('?section=Experience'));
		restoreHistory('?section=Projects');
		view.rerender(content('?section=Projects'));
		expect(screen.getByRole('status')).toHaveTextContent('Projects');

		view.rerender(content('?section=Experience'));

		expect(window.location.search).toBe('?section=Projects');
		expect(screen.getByRole('status')).toHaveTextContent('Projects');
	});
});
