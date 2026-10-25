import { requireAdminPage } from '@/lib/admin';
import { SkillsMultiSelect } from '@/components/skills-multi-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSkillOptions } from '@/lib/queries/skills';
import { createProject } from '@/lib/actions/projects';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';

export default async function NewProjectDashboardPage() {
	await requireAdminPage();
	const skillsList = await getSkillOptions();

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
					<h1 className="text-3xl font-semibold tracking-tight">Nuevo Proyecto</h1>
					<p className="mt-1 text-muted-foreground">
						Añade un nuevo proyecto a tu portfolio
					</p>
				</div>
			</div>

			{/* Form Card */}
			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información del proyecto</CardTitle>
					<CardDescription>Completa los datos del nuevo proyecto</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={createProject} className="space-y-6">
						{/* Title Field */}
						<div className="space-y-2">
							<Label htmlFor="title">Título</Label>
							<Input
								type="text"
								name="title"
								id="title"
								placeholder="Ej: Mi Portfolio, E-commerce App..."
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
							/>
							<p className="text-xs text-muted-foreground">
								Enlace al repositorio en GitHub, GitLab, etc. (opcional)
							</p>
						</div>

						{/* Skills Field */}
						<div className="space-y-2">
							<Label>Tecnologías utilizadas</Label>
							<SkillsMultiSelect skills={skillsList} name="skillIds" />
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
							>
								<option value="in-progress">En progreso</option>
								<option value="active">Activo</option>
								<option value="archived">Archivado</option>
							</select>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3 pt-4">
							<Button type="submit" className="gap-2">
								<Plus className="size-4" />
								Crear proyecto
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
