import { requireAdminPage } from '@/lib/admin';
import { getSocialLinkById } from '@/lib/queries/social-links';
import { updateSocialLink } from '@/lib/actions/social-links';
import { DEFAULT_SOCIAL_LINK_COLOR } from '@/lib/schemas/social-links';
import { SocialLinkForm } from '@/components/admin/social-link-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function UpdateSocialLinkDashboardPage(props: {
	params: Promise<{ id: string }>;
}) {
	await requireAdminPage();
	const { id } = await props.params;
	const socialLinkResult = await getSocialLinkById(Number(id));
	if (!socialLinkResult) return <p>Enlace social no encontrado</p>;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/dashboard/social-links" aria-label="Volver a enlaces sociales">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Editar Enlace Social</h1>
					<p className="mt-1 text-muted-foreground">
						Modifica los datos de{' '}
						<span className="font-medium text-foreground">{socialLinkResult.name}</span>
					</p>
				</div>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>Información del enlace</CardTitle>
					<CardDescription>Actualiza los campos que necesites modificar</CardDescription>
				</CardHeader>
				<CardContent>
					<SocialLinkForm
						action={updateSocialLink.bind(null, Number(id))}
						defaultColor={DEFAULT_SOCIAL_LINK_COLOR}
						initialValues={{
							name: socialLinkResult.name,
							url: socialLinkResult.url,
							icon: socialLinkResult.icon,
							color: socialLinkResult.color,
						}}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
