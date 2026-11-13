'use client';

import { useId } from 'react';
import { AlertTriangle, FolderKanban, Plus } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectsTable } from '@/components/admin/projects-table';
import type { ProjectImageActionResult, ProjectImageFeedback } from '@/lib/og-image-feedback';
import { useProjectImageFeedback } from '@/components/admin/use-project-image-feedback';
import type { ProjectInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProjectsDashboardProps {
	projects: ProjectInfo[];
	initialFeedback?: ProjectImageFeedback;
	onDelete: (id: number) => Promise<ProjectImageActionResult>;
	refreshOgImage: (id: number) => Promise<ProjectImageActionResult>;
}

export function ProjectsDashboard({
	projects,
	initialFeedback,
	onDelete,
	refreshOgImage,
}: ProjectsDashboardProps) {
	const {
		feedback,
		pendingProjectId,
		status,
		headingRef,
		feedbackRef,
		canRetry,
		dismissFeedback,
		reloadFeedback,
		runOperation,
	} = useProjectImageFeedback({ projects, initialFeedback, onDelete, refreshOgImage });
	const feedbackId = useId();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1
						ref={headingRef}
						tabIndex={-1}
						className="text-3xl font-semibold tracking-tight"
					>
						Proyectos
					</h1>
					<p className="mt-1 text-muted-foreground">
						Gestiona tus proyectos del portfolio
					</p>
				</div>
				<Button asChild size="lg" className="gap-2">
					<Link href="/dashboard/projects/new">
						<Plus aria-hidden="true" data-icon="inline-start" />
						Nuevo Proyecto
					</Link>
				</Button>
			</div>
			{feedback && (
				<Alert ref={feedbackRef} id={feedbackId} tabIndex={-1} aria-atomic="true">
					<AlertTriangle aria-hidden="true" />
					<AlertTitle>{feedback.title}</AlertTitle>
					<AlertDescription>
						<p className="wrap-break-word">{feedback.projectTitle}</p>
						<p>{feedback.message}</p>
						{feedback.reference && (
							<p className="break-all">Referencia: {feedback.reference}</p>
						)}
						<div className="flex flex-wrap gap-2">
							{feedback.uncertain && (
								<Button
									variant="outline"
									className="min-h-11"
									disabled={pendingProjectId !== undefined}
									onClick={reloadFeedback}
								>
									Recargar página
								</Button>
							)}
							{canRetry && (
								<Button
									variant="outline"
									className="min-h-11"
									disabled={pendingProjectId !== undefined}
									aria-busy={pendingProjectId === feedback.projectId}
									aria-describedby={feedbackId}
									onClick={() => void runOperation(feedback.projectId, 'refresh')}
								>
									Reintentar imagen
								</Button>
							)}
							<Button
								variant="ghost"
								className="min-h-11"
								onClick={dismissFeedback}
								disabled={pendingProjectId !== undefined}
							>
								Cerrar aviso
							</Button>
						</div>
					</AlertDescription>
				</Alert>
			)}
			<p
				role="status"
				aria-atomic="true"
				className={cn('text-sm text-muted-foreground', !status && 'sr-only')}
			>
				{status}
			</p>
			{projects.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<div className="mb-4 rounded-full bg-muted p-4">
							<FolderKanban
								className="size-8 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
						<h2 className="mb-2 text-lg font-semibold">No hay proyectos todavía</h2>
						<p className="mb-6 max-w-sm text-center text-muted-foreground">
							Comienza añadiendo tus primeros proyectos para mostrarlos en tu
							portfolio.
						</p>
						<Button asChild>
							<Link href="/dashboard/projects/new">Crear primer proyecto</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Todos los Proyectos</CardTitle>
						<CardDescription>
							{projects.length}{' '}
							{projects.length === 1
								? 'proyecto registrado'
								: 'proyectos registrados'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ProjectsTable
							projects={projects}
							onDelete={(id) => void runOperation(id, 'delete')}
							refreshOgImage={(id) => runOperation(id, 'refresh')}
							pendingProjectId={pendingProjectId}
							feedbackProjectId={feedback?.projectId}
							feedbackId={feedback ? feedbackId : undefined}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
