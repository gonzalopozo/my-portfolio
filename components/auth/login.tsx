'use client';

import { authClient } from '@/lib/auth-client';
import { useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

export function LoginForm() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const formData = new FormData(e.currentTarget);

		try {
			await authClient.signIn.email(
				{
					email: formData.get('email') as string,
					password: formData.get('password') as string,
				},
				{
					onSuccess: () => {
						toast.success('Signed in successfully');
						// eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard session-dependent router state with a full document load.
						window.location.assign('/dashboard');
					},
					onError: () => {
						toast.error('Unable to sign in. Check your credentials and try again.');
						setError('Unable to sign in. Check your credentials and try again.');
					},
				},
			);
		} catch {
			setError('Unable to sign in. Please try again.');
		}
		setLoading(false);
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col">
			<h1>Login</h1>
			<div>
				<label htmlFor="email">Email:</label>
				<input type="email" name="email" id="email" placeholder="email" />
			</div>
			<div>
				<label htmlFor="password">Password:</label>
				<input type="password" name="password" id="password" placeholder="password" />
			</div>

			{error && <div role="alert">{error}</div>}

			<button type="submit" disabled={loading} aria-busy={loading}>
				{loading && <Spinner className="size-6 text-current" />} Login!{' '}
			</button>
		</form>
	);
}
