import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RequestError } from '@/components/request-error';

describe('safe error recovery', () => {
	it('does not render private error details and offers a usable reset', async () => {
		const reset = vi.fn();
		render(<RequestError error={new Error('private database credentials')} reset={reset} />);
		expect(screen.getByRole('alert')).not.toHaveTextContent('private database credentials');
		await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(reset).toHaveBeenCalledOnce();
	});
	it('does not render private server error details or its digest', () => {
		const error = Object.assign(new Error('private server error'), {
			digest: 'synthetic-digest',
		});
		render(<RequestError error={error} reset={vi.fn()} />);
		expect(screen.getByRole('alert')).not.toHaveTextContent('private server error');
		expect(screen.getByRole('alert')).not.toHaveTextContent('synthetic-digest');
	});
});
