import { requireAdminPage } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getSiteSettings } from '@/lib/queries/settings';
import { updateSiteSettings } from '@/lib/actions/settings';
import { type Settings } from '@/lib/types';
import { Save, Settings as SettingsIcon, Briefcase, FileText } from 'lucide-react';

export default async function SettingsDashboardPage() {
	await requireAdminPage();
	const settings: Settings | undefined = await getSiteSettings();

	if (!settings) {
		return (
			<Card className="border-dashed">
				<CardContent className="flex flex-col items-center justify-center py-16">
					<div className="mb-4 rounded-full bg-muted p-4">
						<SettingsIcon className="size-8 text-muted-foreground" />
					</div>
					<h3 className="mb-2 text-lg font-semibold">No hay configuración todavía</h3>
					<p className="max-w-sm text-center text-muted-foreground">
						No se encontró ninguna configuración del sitio.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
					<p className="mt-1 text-muted-foreground">
						Gestiona la configuración de tu portfolio y estado laboral
					</p>
				</div>
			</div>

			{/* Form */}
			<form action={updateSiteSettings} className="max-w-2xl space-y-6">
				{/* Employment Status Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Briefcase className="size-5 text-muted-foreground" />
							<CardTitle>Estado Laboral</CardTitle>
						</div>
						<CardDescription>
							Este estado se mostrará en tu portfolio para que los visitantes sepan si
							estás disponible para nuevas oportunidades.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Employment Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label htmlFor="isEmployed">Actualmente empleado</Label>
								<p className="text-sm text-muted-foreground">
									Desactiva si estás abierto a nuevas oportunidades
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Badge variant={settings.isEmployed ? 'default' : 'secondary'}>
									{settings.isEmployed ? 'Empleado' : 'Disponible'}
								</Badge>
								<Switch
									id="isEmployed"
									name="isEmployed"
									defaultChecked={settings.isEmployed ?? false}
								/>
							</div>
						</div>

						{/* Status Message Field */}
						<div className="space-y-2">
							<Label htmlFor="statusMessage">Mensaje de estado</Label>
							<Textarea
								id="statusMessage"
								name="statusMessage"
								placeholder="Ej: Abierto a oportunidades remotas, Buscando roles senior..."
								rows={2}
								defaultValue={settings.statusMessage ?? ''}
							/>
							<p className="text-xs text-muted-foreground">
								Mensaje opcional que se mostrará junto a tu estado laboral
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Resume Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<FileText className="size-5 text-muted-foreground" />
							<CardTitle>Currículum</CardTitle>
						</div>
						<CardDescription>
							Enlace a tu currículum o CV para posibles empleadores
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<Label htmlFor="resumeUrl">URL del currículum</Label>
							<Input
								type="url"
								id="resumeUrl"
								name="resumeUrl"
								placeholder="https://drive.google.com/..."
								defaultValue={settings.resumeUrl}
							/>
							<p className="text-xs text-muted-foreground">
								Enlace a Google Drive, Dropbox u otro servicio de almacenamiento
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Actions */}
				<div className="flex items-center gap-3 pt-4">
					<Button type="submit" className="gap-2">
						<Save className="size-4" />
						Guardar configuración
					</Button>
				</div>
			</form>
		</div>
	);
}
