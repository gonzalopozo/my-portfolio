'use client';

import { safeWebUrl } from '@/lib/security/urls';

import { Button } from '@/components/ui/button';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { type ProjectInfo } from '@/lib/types';
import { Pencil, ExternalLink, Trash, Github } from 'lucide-react';
import Link from 'next/link';
import { DragDropProvider } from '@dnd-kit/react';
import { RxUpdate } from 'react-icons/rx';
import { updateProjectOrder } from '@/lib/actions/projects';
import { formatDate } from '@/lib/utils';
import { SortableTableBody, SortableTableRow } from '@/components/admin/sortable-table';
import { useSortableTableOrder } from '@/components/admin/use-sortable-table-order';
import { toast } from 'sonner';

interface ProjectsTableProps {
	projects: ProjectInfo[];
	onDelete: (id: number) => void;
	refreshOgImage: (id: number) => Promise<void>;
	pendingProjectId?: number;
	feedbackProjectId?: number;
	feedbackId?: string;
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
	const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
		active: 'default',
		'in-progress': 'secondary',
		archived: 'outline',
	};
	return variants[status] || 'secondary';
}

function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		active: 'Activo',
		'in-progress': 'En progreso',
		archived: 'Archivado',
	};
	return labels[status] || status;
}

export function ProjectsTable({
	projects: serverProjects,
	onDelete,
	refreshOgImage,
	pendingProjectId,
	feedbackProjectId,
	feedbackId,
}: ProjectsTableProps) {
	const {
		items: projects,
		handleDragEnd,
		isSaving,
	} = useSortableTableOrder({
		items: serverProjects,
		updateOrder: updateProjectOrder,
		onSuccess: (name, newOrder) => {
			toast.success(`Proyecto "${name}" actualizado a la posición ${newOrder}`);
		},
	});

	return (
		<DragDropProvider onDragEnd={handleDragEnd}>
			<Table aria-busy={isSaving || pendingProjectId !== undefined}>
				<TableHeader>
					<TableRow>
						<TableHead className="w-16">
							<span className="sr-only">Reordenar</span>
						</TableHead>
						<TableHead className="w-16">Orden</TableHead>
						<TableHead>Título</TableHead>
						<TableHead className="max-w-50">Descripción</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Skills</TableHead>
						<TableHead>Enlaces</TableHead>
						<TableHead>Actualizado</TableHead>
						<TableHead className="text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<SortableTableBody id="projects">
					{projects.map((project, index) => (
						<SortableTableRow
							key={project.id}
							id={project.id}
							index={index}
							label={`Reordenar proyecto "${project.title}"`}
							disabled={isSaving}
						>
							<TableCell>
								<Badge variant="outline" className="font-mono">
									{project.order}
								</Badge>
							</TableCell>
							<TableCell className="font-medium">{project.title}</TableCell>
							<TableCell className="max-w-50">
								<p className="truncate text-sm text-muted-foreground">
									{project.description || 'Sin descripción'}
								</p>
							</TableCell>
							<TableCell>
								<Badge variant={getStatusVariant(project.status)}>
									{getStatusLabel(project.status)}
								</Badge>
							</TableCell>
							<TableCell>
								<div className="flex max-w-37.5 flex-wrap gap-1">
									{project.projectSkills.length > 0 ? (
										project.projectSkills.slice(0, 3).map(({ skill }) => (
											<Badge
												key={skill.id}
												variant="secondary"
												className="text-xs"
											>
												{skill.name}
											</Badge>
										))
									) : (
										<span className="text-sm text-muted-foreground">
											Sin habilidades
										</span>
									)}
									{project.projectSkills.length > 3 && (
										<Badge variant="secondary" className="text-xs">
											+{project.projectSkills.length - 3}
										</Badge>
									)}
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									{project.url && (
										<a
											href={safeWebUrl(project.url)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center text-primary hover:text-primary-hover"
											title="Ver proyecto"
										>
											<ExternalLink className="size-4" />
										</a>
									)}
									{project.repoUrl && (
										<a
											href={safeWebUrl(project.repoUrl)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center text-muted-foreground hover:text-foreground"
											title="Ver repositorio"
										>
											<Github className="size-4" />
										</a>
									)}
									{!project.url && !project.repoUrl && (
										<span className="text-muted-foreground">Sin enlaces</span>
									)}
								</div>
							</TableCell>
							<TableCell className="text-sm text-muted-foreground">
								{formatDate(project.updatedAt)}
							</TableCell>
							<TableCell className="text-right">
								<div className="flex items-center justify-end gap-1">
									<Button
										onClick={() => void refreshOgImage(project.id)}
										disabled={pendingProjectId !== undefined || isSaving}
										aria-busy={pendingProjectId === project.id}
										aria-label={`Actualizar imagen Open Graph de ${project.title}`}
										aria-describedby={
											feedbackProjectId === project.id
												? feedbackId
												: undefined
										}
										variant="ghost"
										size="sm"
										className="min-h-11 min-w-11 cursor-pointer gap-1.5"
									>
										<RxUpdate aria-hidden="true" />
									</Button>
									<Button variant="ghost" size="sm" asChild>
										<Link
											href={`/dashboard/projects/${project.id}/edit`}
											className="gap-1.5"
										>
											<Pencil className="size-3.5" />
											Editar
										</Link>
									</Button>
									<Button
										onClick={() => onDelete(project.id)}
										disabled={pendingProjectId !== undefined || isSaving}
										aria-describedby={
											feedbackProjectId === project.id
												? feedbackId
												: undefined
										}
										variant="destructive"
										size="sm"
										className="gap-1.5"
									>
										<Trash className="size-3.5" />
										Eliminar
									</Button>
								</div>
							</TableCell>
						</SortableTableRow>
					))}
				</SortableTableBody>
			</Table>
		</DragDropProvider>
	);
}
