import { requireAdminPage } from '@/lib/admin';
import { SkillsMultiSelect } from '@/components/skills-multi-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getProjectById } from '@/lib/queries/projects';
import { getSkillOptions } from '@/lib/queries/skills';
import { updateProject } from '@/lib/actions/projects';
import { type ProjectInfo } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function UpdateProjectDashboardPage(props: {
	params: Promise<{ id: string }>;
}) {
	await requireAdminPage();
	const params = await props.params;
	const id = Number(params.id);

	const project: ProjectInfo | undefined = await getProjectById(id);

	if (!project) return <p className="text-muted-foreground">Proyecto no encontrado</p>;

	const projectSkill = project.projectSkills.map(({ skill }) => skill.id);

	const skillsList = await getSkillOptions();

	const updateProjectWithId = updateProject.bind(null, id);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/projects">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Editar Proyecto</h1>
					<p className="mt-1 text-muted-foreground">
						Modifica los datos de{' '}
						<span className="font-medium text-foreground">{project.title}</span>
					</p>
				</div>
			</div>

			{/* Form Card */}
			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información del proyecto</CardTitle>
					<CardDescription>Actualiza los campos que necesites modificar</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={updateProjectWithId} className="space-y-6">
						{/* Title Field */}
						<div className="space-y-2">
							<Label htmlFor="title">Título</Label>
							<Input
								type="text"
								name="title"
								id="title"
								placeholder="Ej: Mi Portfolio, E-commerce App..."
								defaultValue={project.title}
								required
							/>
						</div>

						{/* Description Field */}
						<div className="space-y-2">
							<Label htmlFor="description">Descripción</Label>
							<Textarea
								name="description"
								id="description"
								placeholder="Describe brevemente el proyecto, sus objetivos y características principales..."
								rows={4}
								defaultValue={project.description}
							/>
						</div>

						{/* URL Field */}
						<div className="space-y-2">
							<Label htmlFor="url">URL del proyecto</Label>
							<Input
								type="url"
								name="url"
								id="url"
								placeholder="https://miproyecto.com"
								defaultValue={project.url ?? ''}
							/>
							<p className="text-xs text-muted-foreground">
								Enlace a la versión desplegada del proyecto (opcional)
							</p>
						</div>

						{/* Repository URL Field */}
						<div className="space-y-2">
							<Label htmlFor="repoUrl">URL del repositorio</Label>
							<Input
								type="url"
								name="repoUrl"
								id="repoUrl"
								placeholder="https://github.com/usuario/proyecto"
								defaultValue={project.repoUrl ?? ''}
							/>
							<p className="text-xs text-muted-foreground">
								Enlace al repositorio en GitHub, GitLab, etc. (opcional)
							</p>
						</div>

						{/* Skills Field */}
						<div className="space-y-2">
							<Label>Tecnologías utilizadas</Label>
							<SkillsMultiSelect
								skills={skillsList}
								defaultValue={projectSkill}
								name="skillIds"
							/>
							<p className="text-xs text-muted-foreground">
								Selecciona las tecnologías y herramientas usadas en el proyecto
							</p>
						</div>

						{/* Status Field */}
						<div className="space-y-2">
							<Label htmlFor="status">Estado</Label>
							<select
								name="status"
								id="status"
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
								defaultValue={project.status}
							>
								<option value="in-progress">En progreso</option>
								<option value="active">Activo</option>
								<option value="archived">Archivado</option>
							</select>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3 pt-4">
							<Button type="submit" className="gap-2">
								<Save className="size-4" />
								Guardar cambios
							</Button>
							<Button type="button" variant="outline" asChild>
								<Link href="/dashboard/projects">Cancelar</Link>
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
