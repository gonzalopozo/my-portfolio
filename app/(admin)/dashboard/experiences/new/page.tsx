import { requireAdminPage } from '@/lib/admin';
import { SkillsMultiSelect } from '@/components/skills-multi-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSkillOptions } from '@/lib/queries/skills';
import { createExperience } from '@/lib/actions/experiences';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';

export default async function NewExperienceDashboardPage() {
	await requireAdminPage();
	const skillsList = await getSkillOptions();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/experiences">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Nueva Experiencia</h1>
					<p className="mt-1 text-muted-foreground">
						Añade una nueva experiencia laboral a tu portfolio
					</p>
				</div>
			</div>

			{/* Form Card */}
			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información de la experiencia</CardTitle>
					<CardDescription>Completa los datos de tu experiencia laboral</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={createExperience} className="space-y-6">
						{/* Role Field */}
						<div className="space-y-2">
							<Label htmlFor="role">Puesto / Cargo</Label>
							<Input
								type="text"
								name="role"
								id="role"
								placeholder="Ej: Software Engineer, Frontend Developer..."
								required
							/>
						</div>

						{/* Company Field */}
						<div className="space-y-2">
							<Label htmlFor="company">Empresa</Label>
							<Input
								type="text"
								name="company"
								id="company"
								placeholder="Nombre de la empresa"
								required
							/>
						</div>

						{/* Company URL Field */}
						<div className="space-y-2">
							<Label htmlFor="companyUrl">URL de la empresa</Label>
							<Input
								type="url"
								name="companyUrl"
								id="companyUrl"
								placeholder="https://empresa.com"
							/>
							<p className="text-xs text-muted-foreground">
								Enlace al sitio web de la empresa (opcional)
							</p>
						</div>

						{/* Company Logo Field */}
						<div className="space-y-2">
							<Label htmlFor="companyLogo">Logo de la empresa</Label>
							<Input
								type="text"
								name="companyLogo"
								id="companyLogo"
								placeholder="URL o nombre del logo"
							/>
							<p className="text-xs text-muted-foreground">
								URL de la imagen del logo (opcional)
							</p>
						</div>

						{/* Description Field */}
						<div className="space-y-2">
							<Label htmlFor="description">Descripción</Label>
							<Textarea
								name="description"
								id="description"
								placeholder="Describe tus responsabilidades, logros y tareas principales..."
								rows={4}
							/>
						</div>

						{/* Date Fields */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="startDate">Fecha de inicio</Label>
								<Input type="date" name="startDate" id="startDate" />
							</div>
							<div className="space-y-2">
								<Label htmlFor="endDate">Fecha de fin</Label>
								<Input type="date" name="endDate" id="endDate" />
								<p className="text-xs text-muted-foreground">
									Dejar vacío si es tu trabajo actual
								</p>
							</div>
						</div>

						{/* Location Field */}
						<div className="space-y-2">
							<Label htmlFor="location">Ubicación</Label>
							<Input
								type="text"
								name="location"
								id="location"
								placeholder="Ej: Madrid, España / Remoto"
							/>
						</div>

						{/* Skills Field */}
						<div className="space-y-2">
							<Label>Tecnologías utilizadas</Label>
							<SkillsMultiSelect skills={skillsList} name="skillIds" />
							<p className="text-xs text-muted-foreground">
								Selecciona las tecnologías y herramientas usadas en esta experiencia
							</p>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3 pt-4">
							<Button type="submit" className="gap-2">
								<Plus className="size-4" />
								Crear experiencia
							</Button>
							<Button type="button" variant="outline" asChild>
								<Link href="/dashboard/experiences">Cancelar</Link>
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
