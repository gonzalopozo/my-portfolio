import { safeWebUrl } from '@/lib/security/urls';
import { requireAdminPage } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getExperiences } from '@/lib/queries/experiences';
import { deleteExperience } from '@/lib/actions/experiences';
import { type ExperienceData } from '@/lib/types';
import { Plus, Pencil, Trash, Briefcase, ExternalLink, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';

export default async function ExperiencesDashboardPage() {
	await requireAdminPage();
	const experiencesData: ExperienceData[] = await getExperiences();

	const formatDate = (date: Date | null) => {
		if (!date) return null;
		return new Date(date).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
		});
	};

	const formatDateRange = (startDate: Date | null, endDate: Date | null) => {
		const start = formatDate(startDate);
		const end = endDate ? formatDate(endDate) : 'Presente';
		if (!start) return 'Sin fecha';
		return `${start} - ${end}`;
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Experiencias</h1>
					<p className="mt-1 text-muted-foreground">
						Gestiona tu experiencia laboral y profesional
					</p>
				</div>
				<Button asChild size="lg" className="gap-2">
					<Link href="/dashboard/experiences/new">
						<Plus className="size-4" />
						Nueva Experiencia
					</Link>
				</Button>
			</div>

			{/* Content */}
			{experiencesData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<div className="mb-4 rounded-full bg-muted p-4">
							<Briefcase className="size-8 text-muted-foreground" />
						</div>
						<h3 className="mb-2 text-lg font-semibold">No hay experiencias todavía</h3>
						<p className="mb-6 max-w-sm text-center text-muted-foreground">
							Comienza añadiendo tu primera experiencia laboral para mostrarla en tu
							portfolio.
						</p>
						<Button asChild>
							<Link href="/dashboard/experiences/new">Crear primera experiencia</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Todas las Experiencias</CardTitle>
						<CardDescription>
							{experiencesData.length}{' '}
							{experiencesData.length === 1
								? 'experiencia registrada'
								: 'experiencias registradas'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-16">Orden</TableHead>
									<TableHead>Puesto</TableHead>
									<TableHead>Empresa</TableHead>
									<TableHead>Período</TableHead>
									<TableHead>Ubicación</TableHead>
									<TableHead>Skills</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{experiencesData.map((experience) => (
									<TableRow key={experience.id}>
										<TableCell>
											<Badge variant="outline" className="font-mono">
												{experience.order}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="font-medium">{experience.role}</div>
											{experience.description && (
												<p className="max-w-50 truncate text-xs text-muted-foreground">
													{experience.description}
												</p>
											)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="font-medium">
													{experience.company}
												</span>
												{experience.companyUrl && (
													<a
														href={safeWebUrl(experience.companyUrl)}
														target="_blank"
														rel="noopener noreferrer"
														className="text-primary hover:text-primary/80"
													>
														<ExternalLink className="size-3" />
													</a>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
												<Calendar className="size-3.5" />
												{formatDateRange(
													experience.startDate,
													experience.endDate,
												)}
											</div>
										</TableCell>
										<TableCell>
											{experience.location ? (
												<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
													<MapPin className="size-3.5" />
													{experience.location}
												</div>
											) : (
												<span className="text-muted-foreground">
													Sin ubicación
												</span>
											)}
										</TableCell>
										<TableCell>
											<div className="flex max-w-37.5 flex-wrap gap-1">
												{experience.experienceSkills.length > 0 ? (
													experience.experienceSkills
														.slice(0, 3)
														.map(({ skill }) => (
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
												{experience.experienceSkills.length > 3 && (
													<Badge variant="secondary" className="text-xs">
														+{experience.experienceSkills.length - 3}
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												<Button variant="ghost" size="sm" asChild>
													<Link
														href={`/dashboard/experiences/${experience.id}/edit`}
														className="gap-1.5"
													>
														<Pencil className="size-3.5" />
														Editar
													</Link>
												</Button>
												<Button
													onClick={deleteExperience.bind(
														null,
														experience.id,
													)}
													variant="destructive"
													size="sm"
													className="gap-1.5"
												>
													<Trash className="size-3.5" />
													Eliminar
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
