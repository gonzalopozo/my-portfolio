import { requireAdminPage } from '@/lib/admin';
import { SkillsMultiSelect } from '@/components/skills-multi-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getExperienceById } from '@/lib/queries/experiences';
import { getSkillOptions } from '@/lib/queries/skills';
import { updateExperience } from '@/lib/actions/experiences';
import { type ExperienceData } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function UpdateExperienceDashboardPage(props: {
	params: Promise<{ id: string }>;
}) {
	await requireAdminPage();
	const params = await props.params;
	const id = Number(params.id);

	const experience: ExperienceData | undefined = await getExperienceById(id);

	if (!experience) return <p className="text-muted-foreground">Experiencia no encontrada</p>;

	const experienceSkills = experience.experienceSkills.map(({ skill }) => skill.id);

	const skillsList = await getSkillOptions();

	const updateExperienceWithId = updateExperience.bind(null, id);

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
					<h1 className="text-3xl font-semibold tracking-tight">Editar Experiencia</h1>
					<p className="mt-1 text-muted-foreground">
						Modifica los datos de{' '}
						<span className="font-medium text-foreground">{experience.role}</span> en{' '}
						<span className="font-medium text-foreground">{experience.company}</span>
					</p>
				</div>
			</div>

			{/* Form Card */}
			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información de la experiencia</CardTitle>
					<CardDescription>Actualiza los campos que necesites modificar</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={updateExperienceWithId} className="space-y-6">
						{/* Role Field */}
						<div className="space-y-2">
							<Label htmlFor="role">Puesto / Cargo</Label>
							<Input
								type="text"
								name="role"
								id="role"
								placeholder="Ej: Software Engineer, Frontend Developer..."
								defaultValue={experience.role}
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
								defaultValue={experience.company}
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
								defaultValue={experience.companyUrl ?? ''}
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
								defaultValue={experience.companyLogo ?? ''}
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
								defaultValue={experience.description}
							/>
						</div>

						{/* Date Fields */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="startDate">Fecha de inicio</Label>
								<Input
									type="date"
									name="startDate"
									id="startDate"
									defaultValue={
										experience.startDate
											? experience.startDate.toISOString().slice(0, 10)
											: ''
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="endDate">Fecha de fin</Label>
								<Input
									type="date"
									name="endDate"
									id="endDate"
									defaultValue={
										experience.endDate
											? experience.endDate.toISOString().slice(0, 10)
											: ''
									}
								/>
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
								defaultValue={experience.location ?? ''}
							/>
						</div>

						{/* Skills Field */}
						<div className="space-y-2">
							<Label>Tecnologías utilizadas</Label>
							<SkillsMultiSelect
								skills={skillsList}
								defaultValue={experienceSkills}
								name="skillIds"
							/>
							<p className="text-xs text-muted-foreground">
								Selecciona las tecnologías y herramientas usadas en esta experiencia
							</p>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3 pt-4">
							<Button type="submit" className="gap-2">
								<Save className="size-4" />
								Guardar cambios
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
