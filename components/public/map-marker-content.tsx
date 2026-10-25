'use client';

import { X } from 'lucide-react';
import { TbHandClick, TbHandFinger } from 'react-icons/tb';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ArroyomolinosMarkerPinProps {
	shouldJiggle?: boolean;
}

export function ArroyomolinosMarkerPin({ shouldJiggle = false }: ArroyomolinosMarkerPinProps) {
	return (
		<div className="group relative flex items-center justify-center">
			{/* Outer pulse ring */}
			<span className="absolute size-14 rounded-full bg-primary/30 animation-duration-[2.5s] motion-safe:animate-ping" />
			{/* Middle breathing ring */}
			<span className="absolute size-11 rounded-full bg-primary/20 animation-duration-[3s] motion-safe:animate-pulse" />
			{/* Marker body */}
			<span className="relative flex size-11 items-center justify-center rounded-full border-2 border-card bg-primary shadow-[0_0_12px_var(--primary)] transition-[transform,box-shadow] duration-300 group-hover:scale-110 group-hover:shadow-[0_0_20px_var(--primary)]">
				<span
					className={cn(
						`relative flex size-4 items-center justify-center text-primary-foreground drop-shadow-sm`,
						shouldJiggle && 'motion-safe:group-hover/map:animate-map-marker-jiggle',
					)}
				>
					<TbHandFinger
						aria-hidden="true"
						className="absolute size-5 transition-[transform,opacity] duration-200 group-hover/map:scale-75 group-hover/map:opacity-0"
					/>
					<TbHandClick
						aria-hidden="true"
						className="absolute size-5 scale-75 opacity-0 transition-[transform,opacity] duration-200 group-hover/map:scale-100 group-hover/map:opacity-100"
					/>
				</span>
			</span>
		</div>
	);
}

/** @public */
export function ArroyomolinosTooltip() {
	return (
		<div className="flex items-center gap-1.5">
			<span className="relative flex size-1.5">
				<span className="absolute inline-flex size-full rounded-full bg-status-active opacity-75 animation-duration-[2s] motion-safe:animate-ping" />
				<span className="relative inline-flex size-1.5 rounded-full bg-status-active" />
			</span>
			<span className="text-[10px] leading-none font-medium">
				Arroyomolinos, donde realmente crecí
			</span>
		</div>
	);
}

interface ArroyomolinosPopupProps {
	className?: string;
	onClose?: () => void;
}

export function ArroyomolinosPopup({ className, onClose }: ArroyomolinosPopupProps) {
	return (
		<article
			className={cn(
				`relative w-full transform-[translateZ(0)] overflow-hidden rounded-[1.375rem] border border-border/70 bg-card text-card-foreground shadow-lg`,
				className,
			)}
			data-arroyomolinos-panel
		>
			{onClose && (
				<button
					type="button"
					onClick={onClose}
					className="absolute top-2.5 right-2.5 z-10 flex size-11 cursor-pointer appearance-none items-center justify-center rounded-full border border-border bg-card text-card-foreground transition-[background-color,border-color,color,box-shadow] duration-200 ease-out outline-none select-none hover:border-border/80 hover:bg-card/95 hover:text-card-foreground hover:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.6)] focus-visible:border-border/80 focus-visible:bg-card focus-visible:text-card-foreground focus-visible:shadow-[0_10px_24px_-16px_rgba(15,23,42,0.6)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none md:size-7"
					aria-label="Cerrar historia de Arroyomolinos"
				>
					<X className="size-3.5" aria-hidden="true" />
				</button>
			)}

			<figure className="relative aspect-16/6.75 w-full overflow-hidden bg-secondary">
				<Image
					src="/arroyomolinos.jpg"
					alt="Vista de Arroyomolinos, Madrid"
					fill
					sizes="(max-width: 768px) 14rem, 13rem"
					className="object-cover"
				/>
				<div className="absolute inset-0 bg-linear-to-t from-black/35 via-black/10 to-transparent" />
			</figure>

			<div className="flex flex-col gap-1.5 px-3.5 pt-2.5 pb-3">
				<h3 className="text-xl/tight font-semibold tracking-tight md:text-sm/tight">
					Arroyomolinos, Madrid
				</h3>
				<p className="text-sm/relaxed text-pretty text-muted-foreground md:text-[11px]">
					<span className="font-medium text-foreground">
						I was born in Alcorcón, but moved to Arroyomolinos when I was four
					</span>{' '}
					and grew up there. With its peaceful atmosphere, green spaces, and proximity to
					Madrid, it’s the place that feels most like home to me.
				</p>
			</div>
		</article>
	);
}
