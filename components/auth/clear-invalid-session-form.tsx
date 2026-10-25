'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function ClearInvalidSessionForm() {
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		formRef.current?.requestSubmit();
	}, []);

	return (
		<div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
			<form
				ref={formRef}
				action="/api/auth/clear-invalid-session"
				method="post"
				className="flex w-full max-w-sm flex-col items-center gap-4 rounded-md border border-border bg-card p-6 text-center text-card-foreground"
			>
				<Spinner className="size-5 text-muted-foreground" />
				<div className="space-y-1">
					<h1 className="text-base font-semibold">Session expired</h1>
					<p className="text-sm text-muted-foreground">
						Redirecting you to sign in again.
					</p>
				</div>
				<Button type="submit" variant="outline">
					Continue to login
				</Button>
			</form>
		</div>
	);
}
