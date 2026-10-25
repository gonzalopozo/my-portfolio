import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
	createCollectionCards,
	type GridBreakpoint,
} from '@/components/public/portfolio-grid-layout';
import { usePortfolioTransition } from '@/components/public/use-portfolio-transition';
import type { PortfolioSection } from '@/components/public/portfolio-sections';

const cards = createCollectionCards({
	projects: Array.from({ length: 5 }, (_, i) => ({ id: `project:${i}`, content: null })),
	experiences: Array.from({ length: 3 }, (_, i) => ({ id: `experience:${i}`, content: null })),
	socialLinks: [],
});
type Props = { section: PortfolioSection | null; reduce: boolean };
function setup(section: PortfolioSection | null = null) {
	return renderHook(
		({ section, reduce }: Props) => usePortfolioTransition(cards, section, reduce),
		{ initialProps: { section, reduce: false } },
	);
}

afterEach(cleanup);

describe('portfolio transitions', () => {
	it('moves immediately when opening a section without outgoing cards', () => {
		const { result, rerender } = setup();
		rerender({ section: 'Projects', reduce: false });
		expect(result.current.displayedSection).toBe('Projects');
		expect(result.current.exitingIds).toEqual([]);
	});

	it('waits for all additional cards to fade before restoring All', () => {
		const { result, rerender } = setup('Projects');
		rerender({ section: null, reduce: false });
		const { generation } = result.current;
		expect(result.current.exitingIds).toEqual(['project:3', 'project:4']);
		act(() => result.current.completeExit('project:3', generation));
		expect(result.current.displayedSection).toBe('Projects');
		act(() => result.current.completeExit('project:4', generation));
		expect(result.current.displayedSection).toBeNull();
		expect(result.current.exitingIds).toEqual([]);
	});

	it('cancels exits when returning to the same category and ignores stale completions', () => {
		const { result, rerender } = setup('Projects');
		rerender({ section: null, reduce: false });
		const oldGeneration = result.current.generation;
		rerender({ section: 'Projects', reduce: false });
		expect(result.current.exitingIds).toEqual([]);
		rerender({ section: 'Experience', reduce: false });
		act(() => {
			result.current.completeExit('project:3', oldGeneration);
			result.current.completeExit('project:4', oldGeneration);
		});
		expect(result.current.displayedSection).toBe('Projects');
		const generation = result.current.generation;
		act(() => {
			result.current.completeExit('project:3', generation);
			result.current.completeExit('project:4', generation);
		});
		expect(result.current.displayedSection).toBe('Experience');
	});

	it('uses the latest destination during an unfinished exit', () => {
		const { result, rerender } = setup('Projects');
		rerender({ section: 'Experience', reduce: false });
		rerender({ section: 'About me', reduce: false });
		const generation = result.current.generation;
		act(() => {
			result.current.completeExit('project:3', generation);
			result.current.completeExit('project:4', generation);
		});
		expect(result.current.displayedSection).toBe('About me');
	});

	it('does not wait again for a finished card when the destination changes mid-exit', () => {
		const { result, rerender } = setup('Projects');
		rerender({ section: 'Experience', reduce: false });
		const generation = result.current.generation;
		act(() => result.current.completeExit('project:3', generation));
		rerender({ section: null, reduce: false });
		act(() => result.current.completeExit('project:4', generation));
		expect(result.current.displayedSection).toBeNull();
		expect(result.current.exitingIds).toEqual([]);
	});

	it('completes immediately with reduced motion, including during an exit', () => {
		const { result, rerender } = setup('Projects');
		rerender({ section: null, reduce: false });
		rerender({ section: null, reduce: true });
		expect(result.current.displayedSection).toBeNull();
		expect(result.current.exitingIds).toEqual([]);
		rerender({ section: 'Experience', reduce: true });
		expect(result.current.displayedSection).toBe('Experience');
	});

	it('cancels pending desktop exits when crossing into mobile and ignores their callbacks', () => {
		const { result, rerender } = renderHook(
			({
				section,
				breakpoint,
			}: {
				section: PortfolioSection | null;
				breakpoint: GridBreakpoint;
			}) => usePortfolioTransition(cards, section, false, breakpoint),
			{
				initialProps: {
					section: 'Projects' as PortfolioSection | null,
					breakpoint: 'lg' as GridBreakpoint,
				},
			},
		);
		rerender({ section: null, breakpoint: 'lg' });
		const staleGeneration = result.current.generation;
		expect(result.current.exitingIds.length).toBeGreaterThan(0);
		rerender({ section: 'Experience', breakpoint: 'sm' });
		expect(result.current.displayedSection).toBe('Experience');
		expect(result.current.exitingIds).toEqual([]);
		act(() => result.current.completeExit('project:3', staleGeneration));
		expect(result.current.displayedSection).toBe('Experience');
		rerender({ section: 'Projects', breakpoint: 'sm' });
		rerender({ section: 'About me', breakpoint: 'sm' });
		expect(result.current.displayedSection).toBe('About me');
		expect(result.current.exitingIds).toEqual([]);
		rerender({ section: 'About me', breakpoint: 'md' });
		expect(result.current.displayedSection).toBe('About me');
		expect(result.current.exitingIds).toEqual([]);
	});
});
