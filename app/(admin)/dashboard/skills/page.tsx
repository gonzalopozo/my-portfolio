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
import { getAllSkills } from '@/lib/queries/skills';
import Link from 'next/link';
import { Plus, Pencil, ExternalLink, Trash } from 'lucide-react';
import { deleteSkill } from '@/lib/actions/skills';
import { DynamicIcon } from '@/components/public/dynamic-icon';
import { SkillColorCell } from '@/components/admin/skill-color-cell';

export default async function SkillsDashboardPage() {
	await requireAdminPage();
	const skillsData = await getAllSkills();

	const formatDate = (date: Date) =>
		new Date(date).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});

	const getTypeVariant = (type: string) => {
		const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
			frontend: 'default',
			backend: 'secondary',
			tool: 'outline',
		};
		return variants[type.toLowerCase()] || 'secondary';
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Skills</h1>
					<p className="mt-1 text-muted-foreground">
						Gestiona tus habilidades y tecnologías
					</p>
				</div>
				<Button asChild size="lg" className="gap-2">
					<Link href="/dashboard/skills/new">
						<Plus className="size-4" />
						Nueva Skill
					</Link>
				</Button>
			</div>

			{/* Content */}
			{skillsData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<div className="mb-4 rounded-full bg-muted p-4">
							<Plus className="size-8 text-muted-foreground" />
						</div>
						<h3 className="mb-2 text-lg font-semibold">No hay skills todavía</h3>
						<p className="mb-6 max-w-sm text-center text-muted-foreground">
							Comienza añadiendo tus primeras habilidades y tecnologías para
							mostrarlas en tu portfolio.
						</p>
						<Button asChild>
							<Link href="/dashboard/skills/new">Crear primera skill</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Todas las Skills</CardTitle>
						<CardDescription>
							{skillsData.length}{' '}
							{skillsData.length === 1 ? 'skill registrada' : 'skills registradas'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">#</TableHead>
									<TableHead>Nombre</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead>Icono</TableHead>
									<TableHead className="w-28">Color</TableHead>
									<TableHead>URL</TableHead>
									<TableHead>Creado</TableHead>
									<TableHead>Actualizado</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{skillsData.map((skill) => (
									<TableRow key={skill.id}>
										<TableCell className="font-mono text-xs text-muted-foreground">
											{skill.id}
										</TableCell>
										<TableCell className="font-medium">{skill.name}</TableCell>
										<TableCell>
											<Badge variant={getTypeVariant(skill.type)}>
												{skill.type}
											</Badge>
										</TableCell>
										<TableCell className="font-mono text-sm">
											{skill.icon || skill.customIconUrl ? (
												<div className="flex items-center">
													<DynamicIcon
														customIconUrl={skill.customIconUrl}
														iconFullName={skill.icon}
														className="size-4 shrink-0"
													/>
												</div>
											) : (
												'Sin icono'
											)}
										</TableCell>
										<TableCell>
											<SkillColorCell color={skill.customColor} />
										</TableCell>
										<TableCell>
											{skill.url ? (
												<a
													href={safeWebUrl(skill.url)}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
												>
													Enlace
													<ExternalLink className="size-3" />
												</a>
											) : (
												<span className="text-muted-foreground">
													Sin URL
												</span>
											)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDate(skill.createdAt)}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{formatDate(skill.updatedAt)}
										</TableCell>
										<TableCell className="text-right">
											<Button variant="ghost" size="sm" asChild>
												<Link
													href={`/dashboard/skills/${skill.id}/edit`}
													className="gap-1.5"
												>
													<Pencil className="size-3.5" />
													Editar
												</Link>
											</Button>
											<Button
												variant="destructive"
												size="sm"
												onClick={deleteSkill.bind(null, skill.id)}
											>
												<Trash className="size-3.5" />
												Eliminar
											</Button>
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
