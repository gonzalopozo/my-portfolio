import { requireAdminPage } from '@/lib/admin';
import { createSocialLink } from '@/lib/actions/social-links';
import { DEFAULT_SOCIAL_LINK_COLOR } from '@/lib/schemas/social-links';
import { SocialLinkForm } from '@/components/admin/social-link-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function NewSocialLinkDashboardPage() {
	await requireAdminPage();
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/social-links" aria-label="Volver a enlaces sociales">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Nuevo Enlace Social</h1>
					<p className="mt-1 text-muted-foreground">
						Añade un nuevo enlace a tus redes sociales
					</p>
				</div>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información del enlace</CardTitle>
					<CardDescription>Completa los datos del nuevo enlace social</CardDescription>
				</CardHeader>
				<CardContent>
					<SocialLinkForm
						action={createSocialLink}
						defaultColor={DEFAULT_SOCIAL_LINK_COLOR}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
