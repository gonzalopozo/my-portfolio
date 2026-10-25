import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
	return (
		<div className="space-y-6" aria-busy="true" aria-live="polite">
			<span className="sr-only">Cargando dashboard</span>

			<div className="flex items-center justify-between gap-4">
				<div className="space-y-2">
					<Skeleton className="h-9 w-56" />
					<Skeleton className="h-4 w-80 max-w-full" />
				</div>
				<Skeleton className="h-10 w-40" />
			</div>

			<div className="rounded-lg border bg-card p-6 shadow-xs">
				<div className="mb-6 space-y-2">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-36" />
				</div>
				<div className="space-y-3">
					{Array.from({ length: 5 }).map((_, index) => (
						<div
							key={index}
							className="grid grid-cols-[64px_1.5fr_1fr_1fr_96px] items-center gap-4"
						>
							<Skeleton className="h-6 w-10" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-8 w-24" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
