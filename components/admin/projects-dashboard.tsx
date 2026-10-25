'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, FolderKanban, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectsTable } from '@/components/admin/projects-table';
import {
	clearOgImageWarningParams,
	getOgImageErrorMessage,
	type ProjectImageActionResult,
	type ProjectImageFeedback,
} from '@/lib/og-image-feedback';
import type { ProjectInfo } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProjectsDashboardProps {
	projects: ProjectInfo[];
	initialFeedback?: ProjectImageFeedback;
	onDelete: (id: number) => Promise<ProjectImageActionResult>;
	refreshOgImage: (id: number) => Promise<ProjectImageActionResult>;
}

type Feedback = ProjectImageFeedback & { projectTitle?: string };

function clearWarningUrl() {
	const url = new URL(window.location.href);
	clearOgImageWarningParams(url.searchParams);
	window.history.replaceState(
		window.history.state,
		'',
		`${url.pathname}${url.search}${url.hash}`,
	);
}

function getFeedbackTitle(feedback: Feedback): string {
	if (feedback.error.code === 'delete-failed') {
		return feedback.operation === 'delete'
			? 'Proyecto eliminado con una advertencia de limpieza'
			: feedback.operation === 'refresh'
				? 'Imagen actualizada con una advertencia de limpieza'
				: 'Proyecto guardado con una advertencia de limpieza';
	}
	if (feedback.operation === 'create' || feedback.operation === 'update') {
		return 'Proyecto guardado, pero su imagen no se pudo actualizar';
	}
	return feedback.operation === 'delete'
		? 'No se pudo eliminar el proyecto'
		: 'No se pudo actualizar la imagen Open Graph';
}

function showFeedbackToast(feedback: Feedback, type: 'warning' | 'error') {
	toast[type](getFeedbackTitle(feedback), {
		description: getOgImageErrorMessage(feedback.error.code),
	});
}

export function ProjectsDashboard({
	projects,
	initialFeedback,
	onDelete,
	refreshOgImage,
}: ProjectsDashboardProps) {
	const [feedback, setFeedback] = useState<Feedback | undefined>(initialFeedback);
	const [pendingProjectId, setPendingProjectId] = useState<number>();
	const [status, setStatus] = useState('');
	const busy = useRef(false);
	const headingRef = useRef<HTMLHeadingElement>(null);
	const feedbackRef = useRef<HTMLDivElement>(null);
	const notifiedReferences = useRef(new Set<string>());
	const feedbackId = useId();
	const feedbackProject = projects.find((project) => project.id === feedback?.projectId);
	const canRetry =
		feedback &&
		feedback.operation !== 'delete' &&
		feedback.error.code !== 'delete-failed' &&
		!!feedbackProject?.url;

	useEffect(() => {
		if (!initialFeedback || notifiedReferences.current.has(initialFeedback.error.reference))
			return;
		notifiedReferences.current.add(initialFeedback.error.reference);
		showFeedbackToast(initialFeedback, 'warning');
	}, [initialFeedback]);

	function dismissFeedback() {
		setFeedback(undefined);
		clearWarningUrl();
		headingRef.current?.focus();
	}

	async function runOperation(projectId: number, operation: 'refresh' | 'delete') {
		if (busy.current) return;
		busy.current = true;
		setPendingProjectId(projectId);
		setStatus(
			operation === 'refresh' ? 'Actualizando imagen Open Graph…' : 'Eliminando proyecto…',
		);
		const projectTitle = projects.find((project) => project.id === projectId)?.title;
		try {
			const result = await (operation === 'refresh' ? refreshOgImage : onDelete)(projectId);
			const error = result.ok ? result.warning : result.error;
			if (
				!error &&
				(operation === 'delete' || feedbackRef.current?.contains(document.activeElement))
			) {
				headingRef.current?.focus();
			}
			clearWarningUrl();
			const nextFeedback = error ? { projectId, projectTitle, operation, error } : undefined;
			const successMessage =
				operation === 'refresh' ? 'Imagen Open Graph actualizada.' : 'Proyecto eliminado.';
			setFeedback(nextFeedback);
			setStatus(error ? '' : successMessage);
			if (nextFeedback) {
				showFeedbackToast(nextFeedback, result.ok ? 'warning' : 'error');
			} else {
				toast.success(successMessage);
			}
		} catch {
			// Client transport/auth failures are opaque; never render an exception message.
			clearWarningUrl();
			const nextFeedback: Feedback = {
				projectId,
				projectTitle,
				operation,
				error: { code: 'unexpected', stage: 'persistence', reference: '' },
			};
			setFeedback(nextFeedback);
			setStatus('');
			showFeedbackToast(nextFeedback, 'error');
		} finally {
			busy.current = false;
			setPendingProjectId(undefined);
		}
	}

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
				<Alert ref={feedbackRef} id={feedbackId} aria-atomic="true">
					<AlertTriangle aria-hidden="true" />
					<AlertTitle>{getFeedbackTitle(feedback)}</AlertTitle>
					<AlertDescription>
						<p className="wrap-break-word">
							{feedbackProject?.title ??
								feedback.projectTitle ??
								`Proyecto #${feedback.projectId}`}
						</p>
						<p>{getOgImageErrorMessage(feedback.error.code)}</p>
						{feedback.error.reference && (
							<p className="break-all">Referencia: {feedback.error.reference}</p>
						)}
						<div className="flex flex-wrap gap-2">
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
