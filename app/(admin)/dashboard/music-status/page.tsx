import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MusicStatusPanel } from '@/components/admin/music-status-panel';
import { MusicStatusSkeleton } from '@/components/admin/music-status-skeleton';
import { requireAdminPage } from '@/lib/admin';
import { getAdminMusicStatus } from '@/lib/queries/music-status';

export const metadata: Metadata = {
	title: 'Estado de la música | Portfolio CMS',
	description: 'Consulta el estado de las integraciones de Last.fm y Spotify.',
};

async function MusicStatusContent() {
	return <MusicStatusPanel diagnostics={await getAdminMusicStatus()} />;
}

export default async function MusicStatusDashboardPage() {
	await requireAdminPage();

	return (
		<div className="flex min-w-0 flex-col gap-6" lang="es">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Estado de la música</h1>
					<p className="mt-1 text-muted-foreground">
						Consulta el estado de Last.fm y Spotify y actualiza los datos de la tarjeta
						de música
					</p>
				</div>
			</div>
			<Suspense fallback={<MusicStatusSkeleton />}>
				<MusicStatusContent />
			</Suspense>
		</div>
	);
}
