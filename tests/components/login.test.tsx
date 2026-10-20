import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

const signIn = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth-client', () => ({ authClient: { signIn: { email: signIn } } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { LoginForm } from '@/components/auth/login';

beforeEach(() => vi.resetAllMocks());
describe('login form', () => {
	it('disables duplicate submissions while a login is pending', async () => {
		let finish: (() => void) | undefined;
		signIn.mockReturnValue(
			new Promise<void>((resolve) => {
				finish = resolve;
			}),
		);
		render(<LoginForm />);
		await userEvent.type(screen.getByLabelText('Email:'), 'admin@example.test');
		await userEvent.type(screen.getByLabelText('Password:'), 'synthetic-password');
		await userEvent.click(screen.getByRole('button', { name: 'Login!' }));
		expect(screen.getByRole('button')).toBeDisabled();
		finish!();
		await vi.waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
	});
	it('renders a safe accessible error after an unexpected failure', async () => {
		signIn.mockRejectedValue(new Error('private session token'));
		render(<LoginForm />);
		fireEvent.submit(screen.getByRole('button').closest('form')!);
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Unable to sign in. Please try again.',
		);
		expect(screen.queryByText(/private session token/)).toBeNull();
		expect(screen.getByRole('button')).toBeEnabled();
	});
});
