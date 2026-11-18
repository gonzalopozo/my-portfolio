import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SocialLinkForm } from '@/components/admin/social-link-form';

vi.mock('next/dynamic', () => ({ default: () => () => null }));

afterEach(cleanup);

const action = async () => ({ error: null });

describe('SocialLinkForm hydration', () => {
	it('keeps submission and text fields disabled until hydration', async () => {
		const content = <SocialLinkForm action={action} defaultColor="#66696d" />;
		const container = document.createElement('div');
		container.innerHTML = renderToString(content);
		document.body.append(container);
		const query = within(container);
		const name = query.getByRole('textbox', { name: 'Nombre' });
		const url = query.getByRole('textbox', { name: 'URL' });
		const submit = query.getByRole('button', { name: 'Crear enlace' });
		let root: Root | undefined;
		try {
			expect(name).toBeDisabled();
			expect(url).toBeDisabled();
			expect(submit).toBeDisabled();
			await act(async () => {
				root = hydrateRoot(container, content);
			});
			expect(name).toBeEnabled();
			expect(url).toBeEnabled();
			expect(submit).toBeEnabled();
			fireEvent.change(name, { target: { value: 'Ordered link' } });
			expect(name).toHaveValue('Ordered link');
		} finally {
			act(() => root?.unmount());
			container.remove();
		}
	});
});

describe('SocialLinkForm color previews', () => {
	it('updates both previews from the selected color while submitting the base color', () => {
		const { container } = render(<SocialLinkForm action={action} defaultColor="#66696d" />);
		const colorInput = container.querySelector<HTMLInputElement>('input[name="color"]');

		expect(colorInput?.value).toBe('#66696d');
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más claro #b1b3b6' }),
		).toBeTruthy();
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más oscuro #1f1f21' }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: /seleccionar color del enlace/i }));
		fireEvent.change(screen.getByRole('textbox', { name: 'Hex' }), {
			target: { value: '#123' },
		});
		expect(colorInput?.value).toBe('#66696d');
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más claro #b1b3b6' }),
		).toBeTruthy();

		fireEvent.change(screen.getByRole('textbox', { name: 'Hex' }), {
			target: { value: '#ff0000' },
		});

		expect(colorInput?.value).toBe('#ff0000');
		const lighterPreview = screen.getByRole('img', {
			name: 'Vista previa del color más claro #ff9494',
		}) as HTMLElement;
		const darkerPreview = screen.getByRole('img', {
			name: 'Vista previa del color más oscuro #6b0000',
		}) as HTMLElement;
		expect(lighterPreview.style.backgroundColor).toBe('rgb(255, 148, 148)');
		expect(darkerPreview.style.backgroundColor).toBe('rgb(107, 0, 0)');
	});

	it('initializes the previews from an edited color and falls back for malformed stored colors', () => {
		const initialValues = { name: 'Example', url: '', icon: null, color: '#FF0000' };
		const { container, rerender } = render(
			<SocialLinkForm action={action} defaultColor="#66696d" initialValues={initialValues} />,
		);

		expect(container.querySelector<HTMLInputElement>('input[name="color"]')?.value).toBe(
			'#ff0000',
		);
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más claro #ff9494' }),
		).toBeTruthy();
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más oscuro #6b0000' }),
		).toBeTruthy();

		rerender(
			<SocialLinkForm
				key="malformed"
				action={action}
				defaultColor="#66696d"
				initialValues={{ ...initialValues, color: 'invalid' }}
			/>,
		);

		expect(container.querySelector<HTMLInputElement>('input[name="color"]')?.value).toBe(
			'#66696d',
		);
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más claro #b1b3b6' }),
		).toBeTruthy();
		expect(
			screen.getByRole('img', { name: 'Vista previa del color más oscuro #1f1f21' }),
		).toBeTruthy();
	});
});
