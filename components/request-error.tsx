'use client';

import { Button } from '@/components/ui/button';

/** Show a recovery action without rendering private error details. */
export function RequestError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return (
		<div
			role="alert"
			className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
		>
			<h2 className="text-xl font-semibold">The request could not be completed</h2>
			<p className="text-muted-foreground">
				Please try again. If the problem continues, return later.
			</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
