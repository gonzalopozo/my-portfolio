'use client';
'use no memo';

import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { useQueryState } from 'nuqs';
import { GridLayout, verticalCompactor, useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PortfolioNavigation } from '@/components/public/portfolio-navigation';
import { GridItem } from '@/components/public/grid-item';
import { InfoGridItemContent } from '@/components/public/info-grid-item-content';
import { MapGridItemContent } from '@/components/public/map-grid-item-content';
import { LastTrackGridItemContent } from '@/components/public/last-track-grid-item-content';
import { HobbiesGridItemContent } from '@/components/public/hobbies-grid-item-content';
import { BB8ThemeSwitcher } from '@/components/public/bb8-theme-switcher';
import { portfolioSectionParser } from '@/components/public/portfolio-sections';
import {
	createCollectionCards,
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
import { cn } from '@/lib/utils';

interface PortfolioGridProps {
	infoAboutMe: Omit<Settings, 'id' | 'updatedAt'> | undefined;
	projectCards: PortfolioCardDescriptor[];
	experienceCards: PortfolioCardDescriptor[];
	experienceOverviewCard: ReactNode;
	socialLinkCards: PortfolioCardDescriptor[];
	lastTrack: Track | null;
}

const DRAG_CANCEL_SELECTORS =
	'button, a, input, textarea, select, [role="button"], [role="region"], .bb8-theme-switcher, [data-tech-marquee-viewport]';
const GRID_MAX_WIDTH_PX = 1308.6;
const GRID_ROW_HEIGHT_PX = 34.5;
const GRID_ITEM_MARGIN: [number, number] = [16, 16];

export function PortfolioGrid({
	infoAboutMe,
	projectCards,
	experienceCards,
	experienceOverviewCard,
	socialLinkCards,
	lastTrack,
}: PortfolioGridProps) {
	const [section, setSection] = useQueryState('section', portfolioSectionParser);
	const shouldReduceMotion = useReducedMotion();
	const [isGridEntering, setIsGridEntering] = useState(true);
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
				content: <MapGridItemContent />,
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
				cardClassName: cn(
					'group/hobby @container/hobby-card isolate',
					currentBreakpoint !== 'sm' && '@container-[size]',
				),
				content: <HobbiesGridItemContent />,
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
	const mobileAboutRowStartIds = new Set(
		isMobile && displayedSection === 'About me'
			? [
					'map',
					'theme',
					...orderedCards
						.filter((card) => card.sizeSlot === 'e')
						.filter((_, index) => index % 2 === 1)
						.map((card) => card.id),
				]
			: [],
	);
	const exitingIdSet = new Set(exitingIds);
	const isChangingSection = exitingIdSet.size > 0;
	const matchingCount = cards.filter((card) => matchesSection(card, section)).length;
	const canDrag = currentBreakpoint === 'lg' && hasDragPointer && !isChangingSection;

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

	const gridEntranceInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 32 };
	const gridEntranceAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
	const gridEntranceTransition = {
		duration: shouldReduceMotion ? 0.12 : 0.36,
		ease: 'easeOut' as const,
	};
	const gridCards = orderedCards.map((card) => {
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
				className={cn(
					'min-w-0 focus-within:z-20 hover:z-20',
					isMobile && (isSquare ? 'col-span-1 aspect-square' : 'col-span-2'),
					mobileAboutRowStartIds.has(card.id) && 'col-start-1',
				)}
				inert={isExiting || undefined}
			>
				<m.div
					className={isMobile && !isSquare ? 'w-full' : 'size-full'}
					initial={isGridEntering || shouldReduceMotion ? false : { opacity: 0, y: 12 }}
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
						sizing={isMobile && !isSquare ? 'natural' : 'fixed'}
						cardClassName={card.cardClassName}
						data-portfolio-surface
						className={isMobile && !isSquare ? 'w-full' : 'size-full'}
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
				ref={containerRef}
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
					{mounted && (
						<m.div
							data-portfolio-grid
							data-layout={isMobile ? 'mobile' : 'bento'}
							initial={gridEntranceInitial}
							animate={gridEntranceAnimate}
							transition={gridEntranceTransition}
							onAnimationComplete={() => setIsGridEntering(false)}
							onClickCapture={(event) => {
								if (
									event.target instanceof Element &&
									event.target.closest('[data-portfolio-section-link]')
								) {
									focusSectionRef.current = true;
								}
							}}
						>
							{isMobile ? (
								<div className="grid grid-cols-2 items-start gap-4">
									{gridCards}
								</div>
							) : (
								<GridLayout
									className={cn(isGridEntering && 'portfolio-grid-entering')}
									layout={gridLayouts[bentoBreakpoint]}
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
							)}
						</m.div>
					)}
				</section>
			</div>
		</LazyMotion>
	);
}
