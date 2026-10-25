import { requireAdminPage } from '@/lib/admin';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { SkillForm } from '@/components/admin/skill-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSkillById } from '@/lib/queries/skills';
import { updateSkill } from '@/lib/actions/skills';
import { DynamicIcon } from '@/components/public/dynamic-icon';

export default async function UpdateSkillDashboardPage(props: { params: Promise<{ id: string }> }) {
	await requireAdminPage();
	const { id } = await props.params;
	const skill = await getSkillById(Number(id));
	if (!skill) notFound();

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/skills" aria-label="Back to skills">
						<ArrowLeft aria-hidden="true" />
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-semibold tracking-tight text-pretty">
						Editar Habilidad
					</h1>
					<p className="mt-1 text-muted-foreground">
						Modifica los datos de{' '}
						<span className="font-medium text-foreground">{skill.name}</span>
					</p>
				</div>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información de la habilidad</CardTitle>
					<CardDescription>Actualiza los campos que necesites modificar</CardDescription>
				</CardHeader>
				<CardContent>
					<SkillForm
						action={updateSkill.bind(null, Number(id))}
						initialValues={skill}
						customIconPreview={
							skill.customIconUrl ? (
								<DynamicIcon
									iconFullName={skill.icon}
									customIconUrl={skill.customIconUrl}
									className="size-8 shrink-0"
								/>
							) : null
						}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
