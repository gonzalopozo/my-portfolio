import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SettingsForm } from '@/components/admin/settings-form';

const fields = (
	<>
		<label htmlFor="statusMessage">Mensaje de estado</label>
		<textarea id="statusMessage" name="statusMessage" defaultValue="Original status" />
		<label htmlFor="resumeUrl">URL del currículum</label>
		<input id="resumeUrl" name="resumeUrl" defaultValue="https://example.test/resume.pdf" />
		<button type="submit">Guardar configuración</button>
	</>
);

describe('settings form hydration and saving', () => {
	it('keeps fields unavailable until hydration can preserve edits', async () => {
		const action = vi.fn<(data: FormData) => Promise<void>>();
		const content = <SettingsForm action={action}>{fields}</SettingsForm>;
		const container = document.createElement('div');
		container.innerHTML = renderToString(content);
		document.body.append(container);
		const query = within(container);
		const status = query.getByRole('textbox', { name: 'Mensaje de estado' });
		let root: Root | undefined;
		try {
			expect(status).toBeDisabled();
			expect(query.getByRole('textbox', { name: 'URL del currículum' })).toBeDisabled();
			expect(query.getByRole('button', { name: 'Guardar configuración' })).toBeDisabled();
			await act(async () => {
				root = hydrateRoot(container, content);
			});
			expect(status).toBeEnabled();
			const user = userEvent.setup();
			await user.clear(status);
			await user.type(status, 'Restored status');
			expect(status).toHaveValue('Restored status');
			expect(action).not.toHaveBeenCalled();
		} finally {
			act(() => root?.unmount());
			container.remove();
		}
	});

	it('submits edits once and waits for completion before enabling fields', async () => {
		const request = Promise.withResolvers<void>();
		const action = vi.fn<(data: FormData) => Promise<void>>().mockReturnValue(request.promise);
		render(<SettingsForm action={action}>{fields}</SettingsForm>);
		const form = screen.getByRole('form', { name: 'Configuración del portfolio' });
		const status = screen.getByRole('textbox', { name: 'Mensaje de estado' });
		const button = screen.getByRole('button', { name: 'Guardar configuración' });
		const user = userEvent.setup();
		await user.clear(status);
		await user.type(status, 'Restored status');
		await user.click(button);
		try {
			expect(action).toHaveBeenCalledOnce();
			expect(action.mock.calls[0][0].get('statusMessage')).toBe('Restored status');
			expect(action.mock.calls[0][0].get('resumeUrl')).toBe(
				'https://example.test/resume.pdf',
			);
			expect(form).toHaveAttribute('aria-busy', 'true');
			expect(status).toBeDisabled();
			expect(button).toBeDisabled();
			expect(screen.queryByRole('status')).toBeNull();
			await user.click(button);
			expect(action).toHaveBeenCalledOnce();
		} finally {
			await act(async () => request.resolve());
		}
		expect(form).toHaveAttribute('aria-busy', 'false');
		expect(button).toBeEnabled();
		expect(screen.getByRole('status')).toHaveTextContent('Configuración guardada.');
	});
});
