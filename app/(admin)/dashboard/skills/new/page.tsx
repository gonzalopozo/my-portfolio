import { requireAdminPage } from '@/lib/admin';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SkillForm } from '@/components/admin/skill-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createSkill } from '@/lib/actions/skills';

export default async function NewSkillDashboardPage() {
	await requireAdminPage();
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
						Nueva Habilidad
					</h1>
					<p className="mt-1 text-muted-foreground">
						Añade una nueva habilidad o tecnología a tu portfolio
					</p>
				</div>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información de la habilidad</CardTitle>
					<CardDescription>Completa los datos de la nueva habilidad</CardDescription>
				</CardHeader>
				<CardContent>
					<SkillForm action={createSkill} />
				</CardContent>
			</Card>
		</div>
	);
}
