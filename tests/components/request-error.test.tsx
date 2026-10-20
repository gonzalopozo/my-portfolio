import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@sentry/nextjs', () => ({ captureException: capture }));
import { RequestError } from '@/components/request-error';

describe('safe error recovery', () => {
	it('does not render private error details and offers a usable reset', async () => {
		const reset = vi.fn();
		render(<RequestError error={new Error('private database credentials')} reset={reset} />);
		expect(screen.getByRole('alert')).not.toHaveTextContent('private database credentials');
		await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
		expect(reset).toHaveBeenCalledOnce();
	});
	it('does not duplicate the server instrumentation event', () => {
		capture.mockClear();
		const error = Object.assign(new Error('private server error'), {
			digest: 'synthetic-digest',
		});
		render(<RequestError error={error} reset={vi.fn()} />);
		expect(capture).not.toHaveBeenCalled();
	});
});
