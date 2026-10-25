import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function MusicStatusSkeleton() {
	return (
		<section aria-labelledby="music-status-loading-heading" aria-busy="true" lang="es">
			<Card>
				<CardHeader>
					<CardTitle>
						<h2 id="music-status-loading-heading">Estado de las integraciones</h2>
					</CardTitle>
					<p role="status">Cargando estado de la música…</p>
				</CardHeader>
				<CardContent className="flex flex-col gap-5" aria-hidden="true">
					{['lastfm', 'search', 'artwork'].map((key) => (
						<div key={key} className="flex flex-col gap-2">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-full" />
						</div>
					))}
					<Skeleton className="h-11 w-44" />
				</CardContent>
			</Card>
		</section>
	);
}
