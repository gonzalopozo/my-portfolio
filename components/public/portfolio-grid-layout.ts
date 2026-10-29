import type { CSSProperties, ReactNode } from 'react';
import { verticalCompactor, type Layout, type LayoutItem } from 'react-grid-layout/core';
import type { GridItemVariant } from '@/components/public/grid-item';
import type { PortfolioSection } from '@/components/public/portfolio-sections';

export type GridBreakpoint = 'lg' | 'md' | 'sm';
export type BentoBreakpoint = Exclude<GridBreakpoint, 'sm'>;
export type SectionLayouts = Record<BentoBreakpoint, Layout>;
type HomeSlot = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';

export interface PortfolioCardDescriptor {
	id: string;
	content: ReactNode;
}

export interface PortfolioGridCard extends PortfolioCardDescriptor {
	variant: GridItemVariant;
	homeSlot?: HomeSlot;
	sizeSlot: HomeSlot;
	cardClassName?: string;
}

type PortfolioGridStyle = CSSProperties & {
	[property: `--portfolio-${string}`]: string | number;
};

export const GRID_COLUMNS_BY_BREAKPOINT: Record<BentoBreakpoint, number> = { lg: 4, md: 4 };
const HOME_LAYOUTS: SectionLayouts = {
	lg: [
		{ i: 'a', x: 0, y: 0, w: 2, h: 6 },
		{ i: 'b', x: 2, y: 0, w: 1, h: 6 },
		{ i: 'c', x: 3, y: 0, w: 1, h: 12 },
		{ i: 'd', x: 0, y: 1, w: 1, h: 6 },
		{ i: 'e', x: 1, y: 1, w: 1, h: 6 },
		{ i: 'f', x: 2, y: 1, w: 1, h: 12 },
		{ i: 'g', x: 0, y: 19, w: 2, h: 6 },
		{ i: 'i', x: 3, y: 19, w: 1, h: 6 },
		{ i: 'h', x: 0, y: 25, w: 2, h: 6 },
		{ i: 'j', x: 2, y: 25, w: 2, h: 6 },
	],
	md: [
		{ i: 'a', x: 0, y: 0, w: 4, h: 8 },
		{ i: 'c', x: 0, y: 8, w: 2, h: 12 },
		{ i: 'f', x: 2, y: 8, w: 2, h: 12 },
		{ i: 'h', x: 0, y: 20, w: 4, h: 6 },
		{ i: 'j', x: 0, y: 26, w: 4, h: 6 },
		{ i: 'g', x: 0, y: 32, w: 4, h: 6 },
		{ i: 'b', x: 0, y: 38, w: 2, h: 6 },
		{ i: 'd', x: 2, y: 38, w: 2, h: 6 },
		{ i: 'e', x: 0, y: 44, w: 2, h: 6 },
		{ i: 'i', x: 2, y: 44, w: 2, h: 6 },
	],
};

const SECTION_VARIANTS: Record<PortfolioSection, GridItemVariant> = {
	'About me': 'about',
	Projects: 'project',
	Experience: 'experience',
};

export function matchesSection(card: PortfolioGridCard, section: PortfolioSection | null) {
	return section === null || card.variant === SECTION_VARIANTS[section];
}

export function createCollectionCards({
	projects,
	experiences,
	socialLinks,
}: {
	projects: PortfolioCardDescriptor[];
	experiences: PortfolioCardDescriptor[];
	socialLinks: PortfolioCardDescriptor[];
}): PortfolioGridCard[] {
	const projectSlots: HomeSlot[] = ['c', 'f', 'h'];
	return [
		...projects.map((card, index): PortfolioGridCard => ({
			...card,
			variant: 'project',
			homeSlot: projectSlots[index],
			sizeSlot: projectSlots[index] ?? 'c',
		})),
		...experiences.map((card): PortfolioGridCard => ({
			...card,
			variant: 'experience',
			sizeSlot: 'g',
		})),
		...socialLinks.map((card, index): PortfolioGridCard => ({
			...card,
			variant: 'about',
			homeSlot: index === 0 ? 'e' : undefined,
			sizeSlot: 'e',
		})),
	];
}

function homeLayout(cards: PortfolioGridCard[], breakpoint: BentoBreakpoint): Layout {
	const slots = new Map(
		cards.filter((card) => card.homeSlot).map((card) => [card.homeSlot, card.id]),
	);
	const layout = HOME_LAYOUTS[breakpoint].flatMap((item) => {
		const id = slots.get(item.i as HomeSlot);
		return id ? [{ ...item, i: id }] : [];
	});
	return verticalCompactor.compact(layout, GRID_COLUMNS_BY_BREAKPOINT[breakpoint]);
}

function mobileHomeCards(cards: PortfolioGridCard[]): PortfolioGridCard[] {
	const bySlot = new Map(
		cards.filter((card) => card.homeSlot).map((card) => [card.homeSlot, card]),
	);
	const firstExperience = cards.find(
		(card) => card.variant === 'experience' && card.id !== 'experience-overview',
	);
	return [
		bySlot.get('a'),
		firstExperience,
		bySlot.get('b'),
		bySlot.get('e'),
		bySlot.get('c'),
		bySlot.get('g'),
		bySlot.get('f'),
		bySlot.get('i'),
		bySlot.get('d'),
		bySlot.get('j'),
	].filter((card): card is PortfolioGridCard => card !== undefined);
}

function mobileAboutCards(cards: PortfolioGridCard[]): PortfolioGridCard[] {
	const bySlot = new Map(
		cards.filter((card) => card.homeSlot).map((card) => [card.homeSlot, card]),
	);
	const socialLinks = cards.filter((card) => card.variant === 'about' && card.sizeSlot === 'e');
	return [
		bySlot.get('a'),
		bySlot.get('b'),
		...socialLinks.slice(0, 3),
		bySlot.get('j'),
		...socialLinks.slice(3, 5),
		bySlot.get('i'),
		bySlot.get('d'),
		...socialLinks.slice(5),
	].filter((card): card is PortfolioGridCard => card !== undefined);
}

export function isSquarePortfolioCard(card: PortfolioGridCard) {
	return ['b', 'd', 'e', 'i'].includes(card.sizeSlot);
}

/** Share layout coordinates with CSS so the first paint needs no viewport measurement. */
export function createResponsiveGridPresentation(
	cards: PortfolioGridCard[],
	section: PortfolioSection | null,
	layouts: SectionLayouts,
) {
	const mobileCards = getSectionCards(cards, section, 'sm');
	const desktopCards = getSectionCards(cards, section, 'lg');
	const allCards = [
		...new Map([...mobileCards, ...desktopCards].map((card) => [card.id, card])).values(),
	];
	const mobilePositions = new Map(mobileCards.map((card, index) => [card.id, index]));
	const positions = {
		md: new Map(layouts.md.map((item) => [item.i, item])),
		lg: new Map(layouts.lg.map((item) => [item.i, item])),
	};
	const rowStartIds = new Set(
		section === 'About me'
			? [
					'map',
					'theme',
					...mobileCards
						.filter((card) => card.sizeSlot === 'e')
						.filter((_, index) => index % 2 === 1)
						.map((card) => card.id),
				]
			: [],
	);
	const styles = new Map<string, PortfolioGridStyle>();
	for (const card of allCards) {
		const mobileIndex = mobilePositions.get(card.id);
		const style: PortfolioGridStyle = {
			'--portfolio-mobile-display': mobileIndex === undefined ? 'none' : 'block',
			'--portfolio-mobile-order': mobileIndex ?? 0,
			'--portfolio-mobile-column': isSquarePortfolioCard(card)
				? rowStartIds.has(card.id)
					? '1'
					: 'auto'
				: '1 / -1',
		};
		for (const breakpoint of ['md', 'lg'] as const) {
			const item = positions[breakpoint].get(card.id);
			style[`--portfolio-${breakpoint}-display`] = item ? 'block' : 'none';
			style[`--portfolio-${breakpoint}-column`] = item
				? `${item.x + 1} / span ${item.w}`
				: 'auto';
			style[`--portfolio-${breakpoint}-row`] = item
				? `${item.y + 1} / span ${item.h}`
				: 'auto';
		}
		styles.set(card.id, style);
	}
	return { cards: allCards, styles };
}

export function getSectionCards(
	cards: PortfolioGridCard[],
	section: PortfolioSection | null,
	breakpoint: GridBreakpoint,
): PortfolioGridCard[] {
	if (breakpoint === 'sm') {
		const home = mobileHomeCards(cards);
		if (section === null) return home;
		if (section === 'About me') return mobileAboutCards(cards);
		if (section === 'Experience') return cards.filter((card) => matchesSection(card, section));
		const homeIds = new Set(home.map((card) => card.id));
		return [
			...home.filter((card) => matchesSection(card, section)),
			...cards.filter((card) => !homeIds.has(card.id) && matchesSection(card, section)),
		];
	}
	const positions = homeLayout(cards, breakpoint).toSorted((a, b) => a.y - b.y || a.x - b.x);
	const byId = new Map(cards.map((card) => [card.id, card]));
	const home = positions.map(({ i }) => byId.get(i)!);
	if (section === null) return home;
	return [
		...home.filter((card) => matchesSection(card, section)),
		...cards.filter((card) => !card.homeSlot && matchesSection(card, section)),
		...home.filter((card) => !matchesSection(card, section)),
	];
}

/** Pack matching cards first, then compact every section with the same rules as All. */
export function createSectionLayouts(
	cards: PortfolioGridCard[],
	section: PortfolioSection | null,
): SectionLayouts {
	function createLayout(breakpoint: BentoBreakpoint): Layout {
		if (section === null) return homeLayout(cards, breakpoint);
		const sizes = new Map(HOME_LAYOUTS[breakpoint].map((item) => [item.i, item]));
		const layout: LayoutItem[] = [];
		let x = 0;
		let y = 0;
		let rowHeight = 0;
		let foreground = true;
		for (const card of getSectionCards(cards, section, breakpoint)) {
			const { w, h } = sizes.get(card.sizeSlot)!;
			const matching = matchesSection(card, section);
			if (x + w > GRID_COLUMNS_BY_BREAKPOINT[breakpoint] || (foreground && !matching)) {
				y += rowHeight;
				x = 0;
				rowHeight = 0;
			}
			foreground = matching;
			layout.push({ i: card.id, x, y, w, h });
			x += w;
			rowHeight = Math.max(rowHeight, h);
		}
		return verticalCompactor.compact(layout, GRID_COLUMNS_BY_BREAKPOINT[breakpoint]);
	}
	return { lg: createLayout('lg'), md: createLayout('md') };
}
