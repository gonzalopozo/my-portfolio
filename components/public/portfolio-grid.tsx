'use client';
'use no memo';

import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { GridLayout, verticalCompactor, useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PortfolioNavigation } from '@/components/public/portfolio-navigation';
import { GridItem } from '@/components/public/grid-item';
import { InfoGridItemContent } from '@/components/public/info-grid-item-content';
import { LastTrackGridItemContent } from '@/components/public/last-track-grid-item-content';
import { BB8ThemeSwitcher } from '@/components/public/bb8-theme-switcher';
import {
	PortfolioSectionProvider,
	usePortfolioSection,
} from '@/components/public/portfolio-section-provider';
import {
	createCollectionCards,
	createResponsiveGridPresentation,
	createSectionLayouts,
	getSectionCards,
	isSquarePortfolioCard,
	matchesSection,
	GRID_COLUMNS_BY_BREAKPOINT,
	type GridBreakpoint,
	type PortfolioCardDescriptor,
	type PortfolioGridCard,
	type SectionLayouts,
} from '@/components/public/portfolio-grid-layout';
import { usePortfolioTransition } from '@/components/public/use-portfolio-transition';
import { usePortfolioMedia } from '@/components/public/use-portfolio-media';
import { type Settings, type Track } from '@/lib/types';

interface PortfolioGridProps {
	infoAboutMe: Omit<Settings, 'id' | 'updatedAt'> | undefined;
	projectCards: PortfolioCardDescriptor[];
	experienceCards: PortfolioCardDescriptor[];
	experienceOverviewCard: ReactNode;
	socialLinkCards: PortfolioCardDescriptor[];
	lastTrack: Track | null;
	mapCard: ReactNode;
	hobbiesCard: ReactNode;
}

const DRAG_CANCEL_SELECTORS =
	'button, a, input, textarea, select, [role="button"], [role="region"], .bb8-theme-switcher, [data-tech-marquee-viewport]';
const GRID_MAX_WIDTH_PX = 1308.6;
const GRID_ROW_HEIGHT_PX = 34.5;
const GRID_ITEM_MARGIN: [number, number] = [16, 16];

export function PortfolioGrid(props: PortfolioGridProps) {
	return (
		<PortfolioSectionProvider>
			<PortfolioGridContent {...props} />
		</PortfolioSectionProvider>
	);
}

function PortfolioGridContent({
	infoAboutMe,
	projectCards,
	experienceCards,
	experienceOverviewCard,
	socialLinkCards,
	lastTrack,
	mapCard,
	hobbiesCard,
}: PortfolioGridProps) {
	const { section, setSection } = usePortfolioSection();
	const shouldReduceMotion = useReducedMotion();
	const [savedLayouts, setSavedLayouts] = useState<
		Partial<Record<string, Partial<SectionLayouts>>>
	>({});
	const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
	const { isMobile, hasDragPointer } = usePortfolioMedia();
	const bentoBreakpoint = width >= 996 ? 'lg' : 'md';
	const currentBreakpoint: GridBreakpoint = isMobile ? 'sm' : bentoBreakpoint;
	const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
	const focusSectionRef = useRef(false);
	const previousSectionRef = useRef(section);

	useEffect(() => {
		const previous = previousSectionRef.current;
		previousSectionRef.current = section;
		if (!isMobile) {
			focusSectionRef.current = false;
			return;
		}
		if (!mounted || previous === section) return;
		window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		if (focusSectionRef.current) {
			sectionHeadingRef.current?.focus({ preventScroll: true });
			focusSectionRef.current = false;
		}
	}, [section, isMobile, mounted]);

	const cards = useMemo<PortfolioGridCard[]>(
		() => [
			{
				id: 'info',
				variant: 'about',
				homeSlot: 'a',
				sizeSlot: 'a',
				content: (
					<InfoGridItemContent
						infoAboutMe={
							infoAboutMe ?? { isEmployed: null, resumeUrl: '', statusMessage: null }
						}
					/>
				),
			},
			{
				id: 'map',
				variant: 'about',
				homeSlot: 'b',
				sizeSlot: 'b',
				cardClassName: 'group/map',
				content: mapCard,
			},
			{
				id: 'music',
				variant: 'about',
				homeSlot: 'd',
				sizeSlot: 'd',
				cardClassName: 'group/music @container/music-card @container-[size] isolate',
				content: (
					<LastTrackGridItemContent
						track={lastTrack}
						isDesktop={currentBreakpoint === 'lg'}
					/>
				),
			},
			{
				id: 'hobbies',
				variant: 'about',
				homeSlot: 'j',
				sizeSlot: 'j',
				cardClassName: 'group/hobby @container/hobby-card isolate md:@container-[size]',
				content: hobbiesCard,
			},
			{
				id: 'theme',
				variant: 'about',
				homeSlot: 'i',
				sizeSlot: 'i',
				content: <BB8ThemeSwitcher />,
			},
			{
				id: 'experience-overview',
				variant: 'experience',
				homeSlot: 'g',
				sizeSlot: 'g',
				content: experienceOverviewCard,
			},
			...createCollectionCards({
				projects: projectCards,
				experiences: experienceCards,
				socialLinks: socialLinkCards,
			}),
		],
		[
			infoAboutMe,
			projectCards,
			experienceCards,
			experienceOverviewCard,
			socialLinkCards,
			lastTrack,
			currentBreakpoint,
			mapCard,
			hobbiesCard,
		],
	);

	const { displayedSection, exitingIds, generation, completeExit } = usePortfolioTransition(
		cards,
		section,
		Boolean(shouldReduceMotion),
		currentBreakpoint,
	);
	const displayedKey = displayedSection ?? 'All';
	const gridLayouts = useMemo(
		() => ({ ...createSectionLayouts(cards, displayedSection), ...savedLayouts[displayedKey] }),
		[cards, displayedSection, displayedKey, savedLayouts],
	);
	const visibleCards = getSectionCards(cards, displayedSection, currentBreakpoint);
	const positions = new Map(gridLayouts[bentoBreakpoint].map((item) => [item.i, item]));
	const orderedCards = isMobile
		? visibleCards
		: visibleCards.toSorted((a, b) => {
				const first = positions.get(a.id)!;
				const second = positions.get(b.id)!;
				return first.y - second.y || first.x - second.x;
			});
	const presentation = createResponsiveGridPresentation(cards, displayedSection, gridLayouts);
	const renderedCards = mounted ? orderedCards : presentation.cards;
	const layoutIds = new Set(gridLayouts[bentoBreakpoint].map((item) => item.i));
	const layoutBottom = Math.max(
		0,
		...gridLayouts[bentoBreakpoint].map((item) => item.y + item.h),
	);
	// Mobile-only cards share the same elements during hydration. CSS places them
	// independently; supplementary items stay below the bento layout until measured.
	const renderedLayout = [
		...gridLayouts[bentoBreakpoint],
		...renderedCards
			.filter((card) => !layoutIds.has(card.id))
			.map((card, index) => ({
				i: card.id,
				x: 0,
				y: layoutBottom + index,
				w: 1,
				h: 1,
				static: true,
			})),
	];
	const exitingIdSet = new Set(exitingIds);
	const isChangingSection = exitingIdSet.size > 0;
	const matchingCount = cards.filter((card) => matchesSection(card, section)).length;
	const canDrag = mounted && currentBreakpoint === 'lg' && hasDragPointer && !isChangingSection;

	function handleDragStop(layout: Layout) {
		if (!canDrag) return;
		setSavedLayouts((previous) => ({
			...previous,
			[displayedKey]: {
				...previous[displayedKey],
				[bentoBreakpoint]: layout.map((item) => ({ ...item })),
			},
		}));
	}

	const gridCards = renderedCards.map((card) => {
		const isExiting = exitingIdSet.has(card.id);
		const isSquare = isSquarePortfolioCard(card);
		return (
			<div
				key={card.id}
				data-portfolio-card={card.id}
				data-category={card.variant}
				data-shape={isSquare ? 'square' : 'rectangle'}
				data-muted={!matchesSection(card, section)}
				data-exiting={isExiting}
				className="min-w-0 focus-within:z-20 hover:z-20"
				style={presentation.styles.get(card.id)}
				inert={isExiting || undefined}
			>
				<m.div
					className={isSquare ? 'size-full' : 'w-full md:h-full'}
					initial={generation === 0 || shouldReduceMotion ? false : { opacity: 0, y: 12 }}
					animate={isExiting ? 'exit' : 'visible'}
					variants={{ exit: { opacity: 0, y: 0 }, visible: { opacity: 1, y: 0 } }}
					transition={{
						duration: shouldReduceMotion ? 0 : isExiting ? 0.16 : 0.24,
						ease: 'easeOut',
					}}
					onAnimationComplete={(definition) => {
						if (definition === 'exit') completeExit(card.id, generation);
					}}
				>
					<GridItem
						variant={card.variant}
						draggable={canDrag}
						sizing="responsive"
						cardClassName={card.cardClassName}
						data-portfolio-surface
						className={isSquare ? 'size-full' : 'w-full md:h-full'}
					>
						{card.content}
					</GridItem>
				</m.div>
			</div>
		);
	});

	return (
		<LazyMotion features={domAnimation}>
			<PortfolioNavigation
				section={section}
				onSectionChange={(nextSection) => {
					focusSectionRef.current = false;
					void setSection(nextSection);
				}}
			/>
			<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
				{section ? `${section}: ${matchingCount} cards` : 'All portfolio highlights'}
			</p>
			<div
				className="mx-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-[3.5vw] md:pb-48"
				style={{ maxWidth: GRID_MAX_WIDTH_PX }}
			>
				<section aria-labelledby="portfolio-section-heading" className="relative">
					<h2
						id="portfolio-section-heading"
						ref={sectionHeadingRef}
						tabIndex={-1}
						className="sr-only outline-none"
					>
						{section ?? 'Portfolio highlights'}
					</h2>
					{section && matchingCount === 0 ? (
						<p className="mb-6 text-center text-muted-foreground">
							No {section.toLowerCase()} to show yet.
						</p>
					) : null}
					<div
						ref={containerRef}
						data-portfolio-grid
						data-layout={isMobile ? 'mobile' : 'bento'}
						data-grid-ready={mounted}
						data-grid-animated={generation > 0 || Object.keys(savedLayouts).length > 0}
						onClickCapture={(event) => {
							if (
								event.target instanceof Element &&
								event.target.closest('[data-portfolio-section-link]')
							) {
								focusSectionRef.current = true;
							}
						}}
					>
						<GridLayout
							layout={renderedLayout}
							width={width}
							gridConfig={{
								cols: GRID_COLUMNS_BY_BREAKPOINT[bentoBreakpoint],
								rowHeight: GRID_ROW_HEIGHT_PX,
								margin: GRID_ITEM_MARGIN,
								containerPadding: [0, 0],
							}}
							compactor={verticalCompactor}
							resizeConfig={{ enabled: false, handles: [] }}
							dragConfig={{
								enabled: canDrag,
								bounded: true,
								threshold: 3,
								cancel: DRAG_CANCEL_SELECTORS,
							}}
							onDragStop={handleDragStop}
						>
							{gridCards}
						</GridLayout>
					</div>
				</section>
			</div>
		</LazyMotion>
	);
}
