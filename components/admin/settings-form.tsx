'use client';

import { useActionState, type ReactNode } from 'react';
import { useHydrated } from '@/lib/use-hydrated';

interface SettingsFormProps {
	action: (formData: FormData) => Promise<void>;
	children: ReactNode;
}

export function SettingsForm({ action, children }: SettingsFormProps) {
	const hydrated = useHydrated();
	const [saved, formAction, pending] = useActionState(async (_saved: boolean, data: FormData) => {
		await action(data);
		return true;
	}, false);

	return (
		<form
			action={formAction}
			aria-label="Configuración del portfolio"
			aria-busy={pending}
			className="flex max-w-2xl flex-col gap-6"
		>
			{/* Textarea hydration can replace edits made before the client is ready. */}
			<fieldset disabled={!hydrated || pending} className="flex min-w-0 flex-col gap-6">
				<legend className="sr-only">Configuración del portfolio</legend>
				{children}
			</fieldset>
			{saved && !pending && (
				<p role="status" className="text-sm text-muted-foreground">
					Configuración guardada.
				</p>
			)}
		</form>
	);
}
