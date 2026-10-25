'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { useQueryState } from 'nuqs';
import type { IconType } from 'react-icons';
import {
	BiDumbbell,
	BiSolidBasketball,
	BiSolidBookOpen,
	BiSolidCar,
	BiSolidRocket,
	BiSolidWatch,
} from 'react-icons/bi';
import { portfolioSectionParser } from '@/components/public/portfolio-sections';
import { usePortfolioMedia } from '@/components/public/use-portfolio-media';
import { cn } from '@/lib/utils';

interface Hobby {
	id: string;
	name: string;
	icon: IconType;
	lightThemeImage: string;
	darkThemeImage: string;
}

const hobbies: Hobby[] = [
	{
		id: 'nba',
		name: 'NBA',
		icon: BiSolidBasketball,
		lightThemeImage: '/hobbies/basketball_dark.png',
		darkThemeImage: '/hobbies/basketball_light.png',
	},
	{
		id: 'cars',
		name: 'Cars',
		icon: BiSolidCar,
		lightThemeImage: '/hobbies/cars_dark.png',
		darkThemeImage: '/hobbies/cars_light.png',
	},
	{
		id: 'watches',
		name: 'Watches',
		icon: BiSolidWatch,
		lightThemeImage: '/hobbies/watches_dark.png',
		darkThemeImage: '/hobbies/watches_light.png',
	},
	{
		id: 'startups',
		name: 'Startups',
		icon: BiSolidRocket,
		lightThemeImage: '/hobbies/startups_dark.png',
		darkThemeImage: '/hobbies/startups_light.png',
	},
	{
		id: 'training',
		name: 'Training',
		icon: BiDumbbell,
		lightThemeImage: '/hobbies/gym_dark.png',
		darkThemeImage: '/hobbies/gym_light.png',
	},
	{
		id: 'reading',
		name: 'Reading',
		icon: BiSolidBookOpen,
		lightThemeImage: '/hobbies/books_dark.png',
		darkThemeImage: '/hobbies/books_light.png',
	},
];

export function HobbiesGridItemContent() {
	const { isMobile, hasDragPointer } = usePortfolioMedia();
	const [activeId, setActiveId] = useState<string | null>(null);
	const [, setSection] = useQueryState('section', portfolioSectionParser);

	if (isMobile) {
		return (
			<section aria-label="Hobbies" className="min-w-0 p-5">
				<ul className="grid grid-cols-2 gap-2">
					{hobbies.map((hobby) => (
						<li
							key={hobby.id}
							className="relative aspect-square min-w-0 overflow-hidden rounded-[10px] bg-card shadow-sm shadow-foreground/10"
						>
							<Image
								src={hobby.lightThemeImage}
								alt=""
								fill
								sizes="(max-width: 767px) 45vw, 200px"
								className="object-cover dark:hidden"
							/>
							<Image
								src={hobby.darkThemeImage}
								alt=""
								fill
								sizes="(max-width: 767px) 45vw, 200px"
								className="hidden object-cover dark:block"
							/>
							<div
								aria-hidden="true"
								className="pointer-events-none absolute inset-0 bg-media-background/10"
							/>
							<span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-3.5rem)] truncate rounded-sm bg-media-background/80 px-1.5 py-0.5 text-[10px] font-normal tracking-[0.02em] text-media-foreground">
								{hobby.name}
							</span>
							<button
								type="button"
								aria-label={`Show About me section from ${hobby.name}`}
								data-portfolio-section-link
								onClick={() => void setSection('About me')}
								className="absolute right-1 bottom-1 grid size-11 cursor-pointer touch-manipulation place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
							>
								<span className="grid size-8 place-items-center rounded-full border border-primary/25 bg-card/90 text-primary shadow-sm shadow-foreground/10">
									<ArrowUpRight aria-hidden="true" className="size-4" />
								</span>
							</button>
						</li>
					))}
				</ul>
			</section>
		);
	}

	return (
		<section aria-label="Hobbies" className="flex size-full min-h-0 flex-col px-5 py-4">
			<div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-2 gap-2">
				{hobbies.map((hobby) => {
					const Icon = hobby.icon;
					const isActive = activeId === hobby.id;

					return (
						<div
							key={hobby.id}
							className={cn(
								'group/hobby-tile relative min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-[10px] border border-border bg-secondary p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:bg-card hover:shadow-sm hover:shadow-foreground/10 motion-reduce:transition-none',
								isActive && 'bg-card shadow-sm shadow-foreground/10',
							)}
							onMouseEnter={() => {
								if (hasDragPointer) setActiveId(hobby.id);
							}}
							onBlur={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget))
									setActiveId(null);
							}}
							onFocus={() => setActiveId(hobby.id)}
							onMouseLeave={() => setActiveId(null)}
						>
							<button
								type="button"
								aria-label={`Preview ${hobby.name}`}
								aria-pressed={isActive}
								onClick={() => setActiveId(isActive ? null : hobby.id)}
								className="absolute inset-0 z-10 size-full cursor-pointer rounded-[10px] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
							>
								<span
									aria-hidden="true"
									className={cn(
										'pointer-events-none absolute inset-0 grid place-items-center text-foreground transition-all duration-700 ease-out group-hover/hobby-tile:-translate-y-1 group-hover/hobby-tile:text-media-foreground group-hover/hobby-tile:opacity-0 motion-reduce:transition-none',
										isActive && '-translate-y-1 opacity-0',
									)}
								>
									<Icon className="size-6" />
								</span>
							</button>
							<div
								aria-hidden="true"
								className={cn(
									'pointer-events-none absolute inset-0 z-0 origin-top-right scale-0 overflow-hidden rounded-[10px] rounded-bl-[10px] opacity-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/hobby-tile:scale-100 group-hover/hobby-tile:opacity-100 motion-reduce:transition-none',
									isActive && 'scale-100 opacity-100',
								)}
							>
								<Image
									src={hobby.lightThemeImage}
									alt=""
									fill
									sizes="200px"
									className="object-cover object-center dark:hidden"
								/>
								<Image
									src={hobby.darkThemeImage}
									alt=""
									fill
									sizes="200px"
									className="hidden object-cover object-center dark:block"
								/>
							</div>
							<div
								aria-hidden="true"
								className={cn(
									'pointer-events-none absolute inset-0 z-0 bg-media-background/10 opacity-0 transition-opacity duration-500 group-hover/hobby-tile:opacity-100 motion-reduce:transition-none',
									isActive && 'opacity-100',
								)}
							/>
							<span
								aria-hidden="true"
								className={cn(
									'pointer-events-none absolute bottom-3 left-3 z-10 max-w-[calc(100%-3.5rem)] truncate rounded-sm bg-media-background/80 px-1.5 py-0.5 text-[10px] font-normal tracking-[0.02em] text-media-foreground transition-all duration-700 ease-out group-hover/hobby-tile:translate-y-0 group-hover/hobby-tile:opacity-100 motion-reduce:transition-none',
									isActive
										? 'translate-y-0 opacity-100'
										: 'translate-y-3 opacity-0',
								)}
							>
								{hobby.name}
							</span>
							<button
								type="button"
								aria-label={`Show About me section from ${hobby.name}`}
								onClick={() => void setSection('About me')}
								className={cn(
									'pointer-events-none absolute right-2.5 bottom-2.5 z-20 grid size-8 cursor-pointer place-items-center rounded-full border border-primary/25 bg-card/90 text-primary shadow-sm shadow-foreground/10 transition-all duration-700 ease-out group-hover/hobby-tile:pointer-events-auto group-hover/hobby-tile:size-9 group-hover/hobby-tile:translate-x-0 group-hover/hobby-tile:opacity-100 hover:-translate-y-0.5 hover:scale-110 hover:-rotate-6 hover:border-primary/55 hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none',
									isActive
										? 'pointer-events-auto translate-x-0 opacity-100'
										: 'translate-x-2 opacity-0',
								)}
							>
								<ArrowUpRight
									aria-hidden="true"
									className="size-4"
									strokeWidth={2.5}
								/>
							</button>
						</div>
					);
				})}
			</div>
		</section>
	);
}
