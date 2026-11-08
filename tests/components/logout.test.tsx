import { act, fireEvent } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogOutButton } from '@/components/auth/logout';

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('@/lib/auth-client', () => ({ authClient: auth }));

beforeEach(() => vi.clearAllMocks());

describe('logout hydration', () => {
	it('renders an unavailable button until its client handler can run', () => {
		const container = document.createElement('div');
		container.innerHTML = renderToString(<LogOutButton />);

		expect(container.querySelector('button')).toBeDisabled();
		expect(auth.signOut).not.toHaveBeenCalled();
	});

	it('enables logout after hydration and prevents duplicate pending requests', async () => {
		const request = Promise.withResolvers<void>();
		auth.signOut.mockReturnValueOnce(request.promise);
		const container = document.createElement('div');
		container.innerHTML = renderToString(<LogOutButton />);
		document.body.append(container);
		const button = container.querySelector('button')!;
		let root: Root | undefined;
		try {
			expect(button).toBeDisabled();
			await act(async () => {
				root = hydrateRoot(container, <LogOutButton />);
			});
			expect(button).toBeEnabled();

			fireEvent.click(button);
			expect(button).toBeDisabled();
			fireEvent.click(button);
			expect(auth.signOut).toHaveBeenCalledOnce();
			await act(async () => request.resolve());
		} finally {
			act(() => root?.unmount());
			container.remove();
		}
	});
});
