'use client';

import { useActionState } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshMusicStatus } from '@/lib/actions/music-status';
import {
	MUSIC_ISSUE_MESSAGES,
	type MusicDiagnostics,
	type MusicIntegration,
	type MusicIntegrationStatus,
	type MusicOperationStatus,
	type MusicStatus,
} from '@/lib/music-status';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

const STATUS_LABELS: Record<MusicStatus, string> = {
	healthy: 'Operativa',
	empty: 'Sin canciones recientes',
	degraded: 'Con incidencias',
	unavailable: 'No disponible',
};
const OPERATION_LABELS: Record<MusicOperationStatus, string> = {
	success: 'Correcto',
	empty: 'Sin resultados',
	skipped: 'Sin consultar',
	failed: 'Error',
};
const INTEGRATION_LABELS: Record<MusicIntegration, string> = {
	lastfm: 'Last.fm',
	'spotify-search': 'Búsqueda de Spotify',
	'spotify-artwork': 'Portada de Spotify',
};

function integrationDescription(result: MusicIntegrationStatus, status: MusicStatus): string {
	if (result.status === 'success') return 'La consulta se completó correctamente.';
	if (result.status === 'failed') return 'La consulta no pudo completarse.';
	if (result.status === 'empty') {
		return result.integration === 'lastfm'
			? 'Last.fm no tiene canciones recientes. Esto no es un error.'
			: 'No hay una coincidencia exacta. Se conserva el enlace de búsqueda.';
	}
	if (status === 'unavailable' || status === 'empty') {
		return 'No se consultó porque no hay una canción de Last.fm disponible.';
	}
	return result.integration === 'spotify-search'
		? 'Faltan datos de la canción o del artista para buscar en Spotify.'
		: 'No se consultó porque no hay un enlace a una canción exacta de Spotify.';
}

export function MusicStatusPanel({ diagnostics }: { diagnostics: MusicDiagnostics }) {
	const [state, formAction, pending] = useActionState(refreshMusicStatus, {
		error: null,
		message: null,
	});
	const needsAttention =
		diagnostics.status === 'unavailable' || diagnostics.status === 'degraded';
	const checkedAt = new Intl.DateTimeFormat('es-ES', {
		dateStyle: 'medium',
		timeStyle: 'medium',
		timeZone: 'Europe/Madrid',
	}).format(new Date(diagnostics.checkedAt));

	return (
		<section aria-labelledby="music-status-heading" lang="es">
			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<CardTitle>
							<h2 id="music-status-heading">Estado de las integraciones</h2>
						</CardTitle>
						<Badge variant={needsAttention ? 'destructive' : 'secondary'}>
							{STATUS_LABELS[diagnostics.status]}
						</Badge>
					</div>
					<CardDescription>
						Resultado guardado de la misma consulta que usa la tarjeta pública. Se
						actualiza al consultar la música o al pulsar «Actualizar estado».
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					{diagnostics.status === 'unavailable' && (
						<p>
							No se puede mostrar la canción en el portfolio hasta que Last.fm
							responda.
						</p>
					)}
					{diagnostics.status === 'degraded' && (
						<p>
							La canción sigue disponible en el portfolio con los datos que se
							pudieron obtener.
						</p>
					)}
					<ul className="flex flex-col gap-4">
						{diagnostics.integrations.map((result) => (
							<li key={result.integration} className="flex min-w-0 flex-col gap-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="font-medium">
										{INTEGRATION_LABELS[result.integration]}
									</span>
									<Badge
										variant={result.issues.length ? 'destructive' : 'outline'}
									>
										{result.status === 'success' && result.issues.length
											? 'Con avisos'
											: OPERATION_LABELS[result.status]}
									</Badge>
								</div>
								<p className="text-sm text-muted-foreground">
									{integrationDescription(result, diagnostics.status)}
								</p>
								{result.issues.map((issue) => (
									<p key={`${issue.operation}-${issue.code}`} className="text-sm">
										{MUSIC_ISSUE_MESSAGES[issue.code]}
										{issue.httpStatus ? ` (HTTP ${issue.httpStatus})` : ''}
										{issue.apiCode ? ` (Código ${issue.apiCode})` : ''}
									</p>
								))}
							</li>
						))}
					</ul>
					<dl className="flex flex-col gap-2 text-sm">
						<div>
							<dt className="text-muted-foreground">
								Último intento (hora de Madrid)
							</dt>
							<dd>
								<time dateTime={diagnostics.checkedAt}>{checkedAt}</time>
							</dd>
						</div>
						<div>
							<dt className="text-muted-foreground">
								Referencia para los registros del despliegue
							</dt>
							<dd className="font-mono break-all">{diagnostics.correlationId}</dd>
						</div>
					</dl>
				</CardContent>
				<CardFooter>
					<form
						action={formAction}
						className="flex w-full flex-col items-start gap-3"
						onSubmit={(event) => {
							// Keep the button focused during retries while blocking duplicate submits.
							if (pending) event.preventDefault();
						}}
					>
						<Button
							type="submit"
							variant="outline"
							aria-disabled={pending}
							aria-busy={pending}
							aria-describedby={
								!pending && state.error
									? 'music-refresh-error'
									: 'music-refresh-status'
							}
							className="min-h-11"
						>
							<RefreshCw aria-hidden="true" data-icon="inline-start" />
							Actualizar estado
						</Button>
						<p
							id="music-refresh-status"
							role="status"
							aria-atomic="true"
							className="text-sm"
						>
							{pending ? 'Actualizando estado…' : state.message}
						</p>
						{!pending && state.error && (
							<p id="music-refresh-error" role="alert" className="text-sm">
								{state.error}
							</p>
						)}
					</form>
				</CardFooter>
			</Card>
		</section>
	);
}
