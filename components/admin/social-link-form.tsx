'use client';

import { useActionState, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPickerField } from '@/components/admin/color-picker';
import { Skeleton } from '@/components/ui/skeleton';
import type { SocialLinkActionState } from '@/lib/actions/social-links';
import { getColorVariants } from '@/lib/social-link-colors';

const IconPicker = dynamic(
	() => import('@/components/admin/icon-picker').then((mod) => mod.IconPicker),
	{ loading: () => <Skeleton className="h-11 w-full rounded-md" /> },
);

interface SocialLinkFormProps {
	action: (state: SocialLinkActionState, formData: FormData) => Promise<SocialLinkActionState>;
	initialValues?: {
		name: string;
		url: string;
		icon: string | null;
		color: string;
	};
	defaultColor: string;
}

export function SocialLinkForm({ action, initialValues, defaultColor }: SocialLinkFormProps) {
	const [state, formAction, pending] = useActionState(action, { error: null });
	const [color, setColor] = useState(() => {
		const initialColor = initialValues?.color ?? defaultColor;
		return /^#[0-9a-f]{6}$/i.test(initialColor) ? initialColor.toLowerCase() : defaultColor;
	});
	const { lighter, darker } = getColorVariants(color);
	const editing = Boolean(initialValues);

	return (
		<form action={formAction} className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<Label htmlFor="name">Nombre</Label>
				<Input
					type="text"
					name="name"
					id="name"
					placeholder="Ej: GitHub, LinkedIn, Twitter..."
					defaultValue={initialValues?.name}
					required
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="url">URL</Label>
				<Input
					type="url"
					name="url"
					id="url"
					placeholder="https://..."
					defaultValue={initialValues?.url}
				/>
				<p className="text-xs text-muted-foreground">Enlace a tu perfil en la red social</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="icon">Icono</Label>
				<IconPicker fullName={initialValues?.icon ?? undefined} />
				<p className="text-xs text-muted-foreground">
					Selecciona un icono para mostrar (opcional)
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="color">Color</Label>
				<ColorPickerField
					name="color"
					label="Seleccionar color del enlace"
					value={color}
					onChange={setColor}
				/>
				<p className="text-xs text-muted-foreground">Color de la tarjeta en el portfolio</p>
				<div className="grid grid-cols-2 gap-3">
					<div className="flex min-w-0 flex-col gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Color más claro
						</span>
						<div
							role="img"
							aria-label={`Vista previa del color más claro ${lighter}`}
							className="h-9 w-full rounded-md border border-border"
							style={{ backgroundColor: lighter }}
						/>
					</div>
					<div className="flex min-w-0 flex-col gap-2">
						<span className="text-xs font-medium text-muted-foreground">
							Color más oscuro
						</span>
						<div
							role="img"
							aria-label={`Vista previa del color más oscuro ${darker}`}
							className="h-9 w-full rounded-md border border-border"
							style={{ backgroundColor: darker }}
						/>
					</div>
				</div>
			</div>

			{state.error && (
				<p role="alert" className="text-sm text-destructive">
					{state.error}
				</p>
			)}

			<div className="flex items-center gap-3 pt-4">
				<Button type="submit" disabled={pending} className="gap-2">
					{editing ? <Save aria-hidden="true" /> : <Plus aria-hidden="true" />}
					{editing ? 'Guardar cambios' : 'Crear enlace'}
				</Button>
				<Button type="button" variant="outline" asChild>
					<Link href="/dashboard/social-links">Cancelar</Link>
				</Button>
			</div>
		</form>
	);
}
