'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Map, MapMarker, MarkerContent } from '@/components/ui/map';
import { ArroyomolinosMarkerPin, ArroyomolinosPopup } from '@/components/public/map-marker-content';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePortfolioMedia } from '@/components/public/use-portfolio-media';

export function MapGridItemContent() {
	const { isMobile, hasDragPointer } = usePortfolioMedia();
	const markerElementRef = useRef<HTMLElement | null>(null);
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

	const handleMapPopupOpen = (event: MouseEvent) => {
		markerElementRef.current =
			event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
		setIsMapPopupOpen(true);
		setCanMapMarkerJiggle(false);
	};

	const handleMapPopupClose = () => {
		setIsMapPopupOpen(false);
	};
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

	return (
		<div
			className="relative size-full"
			onMouseEnter={handleMapGridMouseEnter}
			onMouseLeave={handleMapGridMouseLeave}
		>
			<Map
				className="[&_.maplibregl-canvas]:pointer-events-none"
				center={[-3.916, 40.27]}
				zoom={13}
				attributionControl={false}
				interactive={false}
			>
				<MapMarker
					key={'map-marker'}
					asButton
					longitude={-3.916}
					latitude={40.27}
					onClick={handleMapPopupOpen}
				>
					<MarkerContent>
						<ArroyomolinosMarkerPin
							shouldJiggle={canMapMarkerJiggle && !isMapPopupOpen}
						/>
					</MarkerContent>
				</MapMarker>
			</Map>
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
