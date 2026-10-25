import { requireAdminPage } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SocialLinksTable } from '@/components/admin/social-links-table';
import { getSocialLinks } from '@/lib/queries/social-links';
import { deleteSocialLink } from '@/lib/actions/social-links';
import { Plus, Link2 } from 'lucide-react';
import Link from 'next/link';

export default async function SocialLinksDashboardPage() {
	await requireAdminPage();

	const socialLinksData = await getSocialLinks();

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Social Links</h1>
					<p className="mt-1 text-muted-foreground">
						Gestiona tus enlaces a redes sociales
					</p>
				</div>
				<Button asChild size="lg" className="gap-2">
					<Link href="/dashboard/social-links/new">
						<Plus className="size-4" />
						Nuevo Enlace
					</Link>
				</Button>
			</div>

			{/* Content */}
			{socialLinksData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<div className="mb-4 rounded-full bg-muted p-4">
							<Link2 className="size-8 text-muted-foreground" />
						</div>
						<h3 className="mb-2 text-lg font-semibold">
							No hay enlaces sociales todavía
						</h3>
						<p className="mb-6 max-w-sm text-center text-muted-foreground">
							Comienza añadiendo tus perfiles de redes sociales para mostrarlos en tu
							portfolio.
						</p>
						<Button asChild>
							<Link href="/dashboard/social-links/new">Crear primer enlace</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Todos los Enlaces</CardTitle>
						<CardDescription>
							{socialLinksData.length}{' '}
							{socialLinksData.length === 1
								? 'enlace registrado'
								: 'enlaces registrados'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<SocialLinksTable
							socialLinks={socialLinksData}
							onDelete={deleteSocialLink}
						/>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
