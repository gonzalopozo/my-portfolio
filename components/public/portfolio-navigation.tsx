'use client';

import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { Briefcase, History, LayoutGrid, UserRound, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PortfolioSection } from '@/components/public/portfolio-sections';
import { cn } from '@/lib/utils';

const sections: { url: string; v: PortfolioSection | null; Icon: LucideIcon }[] = [
	{ url: 'All', v: null, Icon: LayoutGrid },
	{ url: 'About me', v: 'About me', Icon: UserRound },
	{ url: 'Projects', v: 'Projects', Icon: Briefcase },
	{ url: 'Experience', v: 'Experience', Icon: History },
];

interface PortfolioNavigationProps {
	section: PortfolioSection | null;
	onSectionChange: (section: PortfolioSection | null) => void;
}

export function PortfolioNavigation({ section, onSectionChange }: PortfolioNavigationProps) {
	const activeUrl = section ?? 'All';
	const shouldReduceMotion = useReducedMotion();
	const navIndicatorTransition = shouldReduceMotion
		? { duration: 0.01, ease: 'linear' as const }
		: { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.9 };
	const navIndicatorInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 };
	const navIndicatorAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 };
	const navLabelInitial = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -4 };
	const navLabelAnimate = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 };
	const navLabelExit = shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -4 };
	const navLabelTransition = {
		duration: shouldReduceMotion ? 0.01 : 0.16,
		ease: 'easeOut' as const,
	};

	return (
		<header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:mb-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:justify-items-center md:gap-4 md:px-7 md:pt-7">
			<div className="flex min-w-0 items-center md:aspect-2048/682 md:w-[clamp(10rem,20vw,15rem)] md:shrink-0 md:justify-center md:justify-self-start">
				<span
					aria-hidden="true"
					className="bg-linear-to-r from-logo-gradient-start via-logo-gradient-middle to-logo-gradient-end bg-clip-text px-1 font-(family-name:--font-fraunces) text-[1.75rem] leading-tight font-black tracking-[-0.04em] whitespace-nowrap text-transparent md:text-[clamp(1.35rem,2.6vw,2rem)] forced-colors:bg-none forced-colors:text-[CanvasText]"
				>
					gonzalopozo
				</span>
				<span className="sr-only">Gonzalo Pozo</span>
			</div>

			<nav
				aria-label="Portfolio sections"
				className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 md:static md:col-start-2 md:row-start-1 md:max-w-none md:translate-x-0 md:justify-self-center"
			>
				<ul className="flex h-14 items-center gap-1 rounded-full border border-border/70 bg-card/95 px-1.5 py-1 shadow-lg shadow-foreground/10 backdrop-blur-xl md:h-10 md:bg-card/90 md:px-1 md:py-0.5 md:shadow-2xl">
					{sections.map(({ url, v, Icon }) => {
						const isActive = activeUrl === url;

						return (
							<li className="shrink-0" key={url}>
								<button
									aria-current={isActive ? 'page' : undefined}
									aria-label={isActive ? undefined : `Show ${url} section`}
									className={cn(
										`group/nav relative isolate flex h-11 touch-manipulation items-center overflow-hidden rounded-full transition-[background-color,box-shadow,color,transform,width] duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.99] md:h-8`,
										isActive
											? `w-[clamp(7.5rem,32vw,8rem)] justify-start pr-2.5 pl-1 text-primary-foreground md:w-auto md:min-w-32 md:pr-3 md:pl-0.5`
											: `w-11 justify-center text-muted-foreground hover:text-foreground md:w-8`,
									)}
									onClick={() => onSectionChange(v)}
									type="button"
								>
									{isActive && (
										<m.span
											className="absolute inset-0 rounded-full bg-primary shadow-lg shadow-primary/25"
											initial={navIndicatorInitial}
											animate={navIndicatorAnimate}
											transition={navIndicatorTransition}
										/>
									)}

									<span
										className={cn(
											`relative z-10 grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-200 ease-out md:size-7`,
											isActive
												? 'bg-primary-foreground/15 text-primary-foreground'
												: `bg-secondary text-muted-foreground group-hover/nav:bg-secondary/80 group-hover/nav:text-foreground`,
										)}
									>
										<Icon aria-hidden="true" className="size-4" />
									</span>

									<AnimatePresence initial={false}>
										{isActive && (
											<m.span
												animate={navLabelAnimate}
												className="relative z-10 min-w-0 pl-1.5 text-xs font-semibold md:pl-2 md:text-sm"
												exit={navLabelExit}
												initial={navLabelInitial}
												transition={navLabelTransition}
											>
												{url}
											</m.span>
										)}
									</AnimatePresence>
								</button>
							</li>
						);
					})}
				</ul>
			</nav>

			<Button
				className="h-11 rounded-full px-5 md:col-start-3 md:row-start-1 md:h-10 md:justify-self-end"
				asChild
			>
				<a href="mailto:pozosanchezgonzalo@gmail.com">Contact</a>
			</Button>
		</header>
	);
}
