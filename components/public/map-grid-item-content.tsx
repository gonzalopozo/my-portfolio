'use client';

import { Component, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { ArroyomolinosMarkerPin, ArroyomolinosPopup } from '@/components/public/map-marker-content';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePortfolioMedia } from '@/components/public/use-portfolio-media';
import { cn } from '@/lib/utils';
import { useDeferredMap } from '@/components/public/use-deferred-map';

const LocationMap = dynamic(() => import('@/components/public/location-map'), {
	ssr: false,
	loading: () => null,
});

class MapBoundary extends Component<
	{ children: ReactNode; onError: () => void },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch() {
		this.props.onError();
	}

	render() {
		return this.state.failed ? null : this.props.children;
	}
}

interface MapGridItemContentProps {
	fingerIcon: ReactNode;
	clickIcon: ReactNode;
}

function getMapAnimations(shouldReduceMotion: boolean | null) {
	const backdropEnterTransition = {
		duration: shouldReduceMotion ? 0.12 : 0.2,
		ease: 'easeOut' as const,
	};
	const backdropExitTransition = {
		duration: shouldReduceMotion ? 0.1 : 0.16,
		ease: 'easeOut' as const,
	};
	const popupInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 };
	const popupAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
	const popupExit = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.985 };
	const popupEnterTransition = {
		duration: shouldReduceMotion ? 0.14 : 0.24,
		ease: 'easeOut' as const,
	};
	const popupExitTransition = {
		duration: shouldReduceMotion ? 0.12 : 0.18,
		ease: 'easeIn' as const,
	};
	return {
		backdropEnterTransition,
		backdropExitTransition,
		popupInitial,
		popupAnimate,
		popupExit,
		popupEnterTransition,
		popupExitTransition,
	};
}

export function MapGridItemContent({ fingerIcon, clickIcon }: MapGridItemContentProps) {
	const { isMobile, hasDragPointer } = usePortfolioMedia();
	const { containerRef, shouldLoadMap } = useDeferredMap();
	const markerElementRef = useRef<HTMLElement | null>(null);
	const [isMapReady, setIsMapReady] = useState(false);
	const [hasMapError, setHasMapError] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const [isMapPopupOpen, setIsMapPopupOpen] = useState(false);
	const [canMapMarkerJiggle, setCanMapMarkerJiggle] = useState(false);
	const handleMapGridMouseEnter = () => {
		if (hasDragPointer && !isMapPopupOpen) {
			setCanMapMarkerJiggle(true);
		}
	};

	const handleMapGridMouseLeave = () => {
		setCanMapMarkerJiggle(false);
	};

	const handleMapPopupOpen = (element: HTMLButtonElement) => {
		markerElementRef.current = element;
		setIsMapPopupOpen(true);
		setCanMapMarkerJiggle(false);
	};

	const handleMapPopupClose = () => {
		setIsMapPopupOpen(false);
		markerElementRef.current?.focus({ preventScroll: true });
	};

	function handleMapError() {
		setHasMapError(true);
		setIsMapReady(false);
	}
	const showMap = isMapReady && !hasMapError;
	const {
		backdropEnterTransition,
		backdropExitTransition,
		popupInitial,
		popupAnimate,
		popupExit,
		popupEnterTransition,
		popupExitTransition,
	} = getMapAnimations(shouldReduceMotion);

	return (
		<div
			ref={containerRef}
			data-location-map
			data-map-state={hasMapError ? 'fallback' : showMap ? 'ready' : 'preview'}
			className="relative size-full"
			onMouseEnter={handleMapGridMouseEnter}
			onMouseLeave={handleMapGridMouseLeave}
		>
			<div className={cn('absolute inset-0', showMap && 'invisible')} aria-hidden="true">
				<Image
					src="/arroyomolinos.jpg"
					alt=""
					fill
					sizes="(max-width: 767px) 50vw, (max-width: 1071px) 50vw, 25vw"
					className="object-cover"
				/>
				<span className="absolute inset-x-3 bottom-3 w-fit rounded-md bg-media-background/80 px-2 py-1 text-xs text-media-foreground">
					Arroyomolinos, Madrid
				</span>
			</div>
			{shouldLoadMap && !hasMapError ? (
				<MapBoundary onError={handleMapError}>
					<div
						className={cn('absolute inset-0', !showMap && 'opacity-0')}
						aria-hidden="true"
					>
						<LocationMap onReady={() => setIsMapReady(true)} onError={handleMapError} />
					</div>
				</MapBoundary>
			) : null}
			<button
				type="button"
				aria-label="Map marker"
				aria-expanded={isMapPopupOpen}
				className="absolute top-1/2 left-1/2 z-1 grid size-14 -translate-1/2 cursor-pointer place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				onClick={(event) => handleMapPopupOpen(event.currentTarget)}
			>
				<ArroyomolinosMarkerPin
					fingerIcon={fingerIcon}
					clickIcon={clickIcon}
					shouldJiggle={canMapMarkerJiggle && !isMapPopupOpen}
				/>
			</button>
			{isMobile ? (
				<Dialog open={isMapPopupOpen} onOpenChange={setIsMapPopupOpen}>
					<DialogContent
						showCloseButton={false}
						className="max-h-[80dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-4xl border-0 p-0"
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							markerElementRef.current?.focus({ preventScroll: true });
						}}
					>
						<DialogTitle className="sr-only">Arroyomolinos, Madrid</DialogTitle>
						<DialogDescription className="sr-only">
							The place I grew up and call home.
						</DialogDescription>
						<ArroyomolinosPopup onClose={handleMapPopupClose} />
					</DialogContent>
				</Dialog>
			) : null}

			<AnimatePresence initial={false}>
				{!isMobile && isMapPopupOpen && (
					<m.div
						aria-hidden="true"
						className="absolute inset-0 z-10 bg-background/12"
						onClick={handleMapPopupClose}
						initial={{ opacity: 0 }}
						animate={{
							opacity: 1,
							transition: backdropEnterTransition,
						}}
						exit={{
							opacity: 0,
							transition: backdropExitTransition,
						}}
					/>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{!isMobile && isMapPopupOpen && (
					<m.div
						className="pointer-events-none absolute inset-x-2 inset-y-4 z-20 flex items-start justify-center"
						initial={popupInitial}
						animate={{
							...popupAnimate,
							transition: popupEnterTransition,
						}}
						exit={{
							...popupExit,
							transition: popupExitTransition,
						}}
					>
						<ArroyomolinosPopup
							onClose={handleMapPopupClose}
							className="pointer-events-auto max-w-52 sm:max-w-56"
						/>
					</m.div>
				)}
			</AnimatePresence>
		</div>
	);
}
