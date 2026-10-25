import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const skeletonCells = [
	{ id: 'hero', className: 'lg:col-span-2 lg:row-span-1 md:col-span-4' },
	{ id: 'profile', className: 'lg:col-span-1 lg:row-span-1 md:col-span-2' },
	{
		id: 'featured-project',
		className: 'lg:col-span-1 lg:row-span-2 md:col-span-2 md:row-span-2',
	},
	{ id: 'skills', className: 'lg:col-span-1 lg:row-span-1 md:col-span-2' },
	{ id: 'music', className: 'lg:col-span-1 lg:row-span-1 md:col-span-2' },
	{ id: 'experience', className: 'lg:col-span-1 lg:row-span-2 md:col-span-2 md:row-span-2' },
	{ id: 'projects', className: 'lg:col-span-2 lg:row-span-1 md:col-span-4' },
	{ id: 'contact', className: 'lg:col-span-1 lg:row-span-1 md:col-span-2' },
];

const mobileCells = [
	{ id: 'intro', className: 'col-span-2 h-88' },
	{ id: 'experience', className: 'col-span-2 h-56' },
	{ id: 'map', className: 'aspect-square' },
	{ id: 'social', className: 'aspect-square' },
	{ id: 'project-one', className: 'col-span-2 h-96' },
	{ id: 'overview', className: 'col-span-2 h-52' },
	{ id: 'project-two', className: 'col-span-2 h-96' },
	{ id: 'theme', className: 'aspect-square' },
	{ id: 'music', className: 'aspect-square' },
	{ id: 'hobbies', className: 'col-span-2 h-72' },
];

export function PortfolioGridSkeleton() {
	return (
		<>
			<span className="sr-only" role="status">
				Loading portfolio
			</span>
			<div aria-hidden="true">
				<div className="mb-6 flex min-h-11 items-center justify-between gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] md:hidden">
					<Skeleton className="h-6 w-36 bg-secondary motion-reduce:animate-none" />
					<Skeleton className="h-11 w-24 rounded-full bg-primary/25 motion-reduce:animate-none" />
				</div>
				<div className="mb-12 hidden justify-center px-[3.5vw] pt-12 md:flex">
					<div className="flex h-10 w-[min(28rem,calc(100vw-1rem))] items-center gap-1 rounded-full border border-border/70 bg-card/90 px-1 py-0.5">
						<Skeleton className="h-8 w-32 rounded-full bg-primary/25 motion-reduce:animate-none" />
						{[0, 1, 2].map((id) => (
							<Skeleton
								key={id}
								className="size-8 rounded-full bg-secondary motion-reduce:animate-none"
							/>
						))}
					</div>
				</div>
				<div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex h-14 -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-card/95 px-1.5 md:hidden">
					<Skeleton className="h-11 w-30 rounded-full bg-primary/25 motion-reduce:animate-none" />
					{[0, 1, 2].map((id) => (
						<Skeleton
							key={id}
							className="size-11 rounded-full bg-secondary motion-reduce:animate-none"
						/>
					))}
				</div>
				<div
					className="mx-auto px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-[3.5vw] md:pb-48"
					style={{ maxWidth: 1308.6 }}
				>
					<div className="grid grid-cols-2 gap-4 md:hidden">
						{mobileCells.map(({ id, className }) => (
							<Skeleton
								key={id}
								className={cn(
									'min-w-0 rounded-4xl bg-card motion-reduce:animate-none',
									className,
								)}
							/>
						))}
					</div>
					<div className="hidden auto-rows-[223px] grid-cols-4 gap-4 md:grid">
						{skeletonCells.map(({ id, className }) => (
							<Skeleton
								key={id}
								className={cn(
									'min-h-0 rounded-4xl border border-border/70 bg-card motion-reduce:animate-none',
									className,
								)}
							/>
						))}
					</div>
				</div>
			</div>
		</>
	);
}
