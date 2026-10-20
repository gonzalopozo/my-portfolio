'use client';

import { useEffect } from 'react';
import { captureException } from '@sentry/nextjs';
import { Button } from '@/components/ui/button';

/** Server digests are already captured by instrumentation; capture client failures once. */
export function RequestError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		if (!error.digest) captureException(error);
	}, [error]);
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
