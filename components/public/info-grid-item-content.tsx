'use client';

import { safeWebUrl } from '@/lib/security/urls';

import Image from 'next/image';
import { File } from 'lucide-react';
import { GridItemShowMoreButton } from '@/components/public/grid-item-show-more-button';
import { usePortfolioMedia } from '@/components/public/use-portfolio-media';
import { cn } from '@/lib/utils';
import type { Settings } from '@/lib/types';

interface InfoGridItemContentProps {
	infoAboutMe: Omit<Settings, 'id' | 'updatedAt'>;
}

export function InfoGridItemContent({ infoAboutMe }: InfoGridItemContentProps) {
	const { isMobile } = usePortfolioMedia();
	const isEmployed = infoAboutMe.isEmployed ?? false;
	const statusLabel =
		infoAboutMe.statusMessage?.trim() || (isEmployed ? 'Working' : 'Open to Work');
	const introduction =
		'I love turning ideas into real products people can use. I care about thoughtful interfaces, solid backend foundations, and the kind of curious, collaborative work that keeps improving the product, the code, and the people building it.';

	if (isMobile) {
		return (
			<div className="flex min-w-0 flex-col gap-5 p-5">
				<div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-4">
					<div className="aspect-3/4 overflow-hidden rounded-2xl bg-muted">
						<Image
							src="/cv_pic.png"
							width={400}
							height={533}
							alt="Gonzalo Pozo, Full Stack Developer"
							sizes="80px"
							className="size-full object-cover"
							priority
						/>
					</div>
					<div className="flex min-w-0 flex-col gap-2">
						<p className="text-xs font-semibold text-primary">Full Stack Developer</p>
						<h3 className="text-2xl/tight font-bold tracking-tight text-balance">
							Hey, I&apos;m Gonzalo.
						</h3>
					</div>
				</div>
				<div
					role="status"
					className={cn(
						'flex min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2 text-xs/relaxed font-semibold',
						isEmployed
							? 'border-status-active/35 bg-status-active/10'
							: 'border-border bg-secondary',
					)}
				>
					<span
						aria-hidden="true"
						className={cn(
							'mt-1 size-2 shrink-0 rounded-full',
							isEmployed ? 'bg-status-active' : 'bg-primary',
						)}
					/>
					<span className="min-w-0 wrap-break-word uppercase">{statusLabel}</span>
				</div>
				<p className="text-sm/relaxed text-pretty text-muted-foreground">{introduction}</p>
				<div
					className={cn(
						'grid gap-2',
						safeWebUrl(infoAboutMe.resumeUrl) ? 'grid-cols-2' : 'grid-cols-1',
					)}
				>
					{safeWebUrl(infoAboutMe.resumeUrl) ? (
						<a
							href={safeWebUrl(infoAboutMe.resumeUrl)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex min-h-11 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-full border border-border bg-secondary px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-primary/10"
						>
							Download CV <File aria-hidden="true" className="size-4 shrink-0" />
						</a>
					) : null}
					<GridItemShowMoreButton
						variant="about"
						buttonVariant="inverse"
						icon="arrow-right"
						iconPosition="end"
						label="About Me"
						className="min-h-11 min-w-0 touch-manipulation rounded-full px-3 text-xs"
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="group/card relative grid size-full min-h-0 min-w-0 grid-rows-[minmax(7.5rem,0.75fr)_minmax(0,1.25fr)] overflow-hidden md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-1">
			<div className="relative flex min-h-0 min-w-0 items-center justify-center border-b border-border p-3 md:border-r md:border-b-0 md:p-5">
				<div className="relative h-full w-[min(72%,18rem)] overflow-hidden rounded-2xl bg-muted shadow-inner md:aspect-3/4 md:w-auto md:max-w-70">
					<Image
						src="/cv_pic.png"
						width={400}
						height={533}
						alt="Gonzalo Pozo, Full Stack Developer"
						className="size-full object-cover grayscale motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out md:group-hover/card:scale-105 md:group-hover/card:grayscale-0"
						priority
					/>
				</div>
			</div>

			<div className="relative grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4 md:p-5">
				<div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-3">
					<span className="min-w-0 truncate text-xs font-semibold text-primary">
						Full Stack Developer
					</span>

					{infoAboutMe.resumeUrl && (
						<a
							href={safeWebUrl(infoAboutMe.resumeUrl)}
							target="_blank"
							rel="noopener noreferrer"
							className="group/download -mr-2 inline-flex h-11 w-34.5 shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full border border-border/80 bg-secondary/40 px-2.5 text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground [-webkit-tap-highlight-color:transparent] hover:border-primary/50 hover:bg-primary/10 hover:text-foreground focus-visible:border-primary/50 focus-visible:bg-primary/10 focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none active:border-primary/70 active:bg-primary/15 active:shadow-inner motion-safe:transition-[background-color,border-color,color,box-shadow] motion-safe:duration-200 motion-safe:ease-out forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2"
							aria-label="Download CV"
						>
							<span>Download CV</span>
							<span
								aria-hidden="true"
								className="grid size-5 shrink-0 place-items-center"
							>
								<span className="grid size-4 origin-center place-items-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover/download:scale-[1.08] motion-safe:group-focus-visible/download:scale-[1.08] motion-safe:group-active/download:scale-105">
									<File className="size-4 stroke-2" />
								</span>
							</span>
						</a>
					)}

					<div
						role="status"
						tabIndex={0}
						className={cn(
							'flex max-h-16 min-w-0 basis-full items-start gap-2.5 overflow-y-auto overscroll-contain rounded-xl border px-3 py-2 text-xs/relaxed font-semibold tracking-wide focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
							isEmployed
								? 'border-status-active/35 bg-status-active/10 text-foreground'
								: 'border-border bg-secondary text-foreground',
						)}
					>
						<span
							aria-hidden="true"
							className={cn(
								'mt-1 size-2 shrink-0 rounded-full motion-safe:animate-pulse motion-reduce:animate-none',
								isEmployed ? 'bg-status-active' : 'bg-primary',
							)}
						/>
						<span className="min-w-0 text-pretty wrap-break-word uppercase">
							{statusLabel}
						</span>
					</div>
				</div>

				<div className="flex min-h-0 min-w-0 flex-col justify-center gap-2 overflow-hidden">
					<h3 className="text-xl/tight font-bold tracking-tight text-balance text-foreground md:text-2xl/tight">
						Hey, I&apos;m Gonzalo.
					</h3>

					<p className="line-clamp-3 max-w-md text-sm/relaxed text-pretty text-muted-foreground">
						{introduction}
					</p>
				</div>

				<div className="flex min-w-0 justify-end">
					<GridItemShowMoreButton
						variant="about"
						buttonSize="lg"
						buttonVariant="inverse"
						icon="arrow-right"
						iconPosition="end"
						label="About Me"
						className="group/cta h-11 w-38 touch-manipulation rounded-full px-4 [-webkit-tap-highlight-color:transparent] forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2"
					/>
				</div>
			</div>
		</div>
	);
}
