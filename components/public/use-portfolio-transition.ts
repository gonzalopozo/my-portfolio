'use client';

import { useState } from 'react';
import type { PortfolioSection } from '@/components/public/portfolio-sections';
import {
	getSectionCards,
	type GridBreakpoint,
	type PortfolioGridCard,
} from '@/components/public/portfolio-grid-layout';

interface TransitionState {
	requested: PortfolioSection | null;
	displayed: PortfolioSection | null;
	exiting: string[];
	remaining: string[];
	generation: number;
	breakpoint: GridBreakpoint;
}

/** Finish outgoing cards before moving the retained cards; ignore completions from canceled exits. */
export function usePortfolioTransition(
	cards: PortfolioGridCard[],
	section: PortfolioSection | null,
	reduceMotion: boolean,
	breakpoint: GridBreakpoint = 'lg',
) {
	const [state, setState] = useState<TransitionState>({
		requested: section,
		displayed: section,
		exiting: [],
		remaining: [],
		generation: 0,
		breakpoint,
	});

	if (
		state.requested !== section ||
		state.breakpoint !== breakpoint ||
		(reduceMotion && state.exiting.length > 0)
	) {
		const targetIds = new Set(getSectionCards(cards, section, breakpoint).map(({ id }) => id));
		const exiting =
			reduceMotion || breakpoint === 'sm' || state.breakpoint !== breakpoint
				? []
				: getSectionCards(cards, state.displayed, breakpoint)
						.filter(({ id }) => !targetIds.has(id))
						.map(({ id }) => id);
		const sameExit =
			exiting.length > 0 &&
			exiting.length === state.exiting.length &&
			exiting.every((id, index) => id === state.exiting[index]);
		setState({
			requested: section,
			displayed: exiting.length ? state.displayed : section,
			exiting,
			remaining: sameExit ? state.remaining : exiting,
			generation: sameExit ? state.generation : state.generation + 1,
			breakpoint,
		});
	}

	function completeExit(id: string, generation: number) {
		setState((current) => {
			if (generation !== current.generation || !current.remaining.includes(id))
				return current;
			const remaining = current.remaining.filter((key) => key !== id);
			return remaining.length
				? { ...current, remaining }
				: { ...current, displayed: current.requested, exiting: [], remaining: [] };
		});
	}

	return {
		displayedSection: state.displayed,
		exitingIds: state.exiting,
		generation: state.generation,
		completeExit,
	};
}
