import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillForm } from '@/components/admin/skill-form';

vi.mock('next/dynamic', () => ({
	default:
		() =>
		({ fullName }: { fullName?: string }) => (
			<input type="hidden" name="icon" id="icon" defaultValue={fullName ?? ''} />
		),
}));

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});

describe('SkillForm custom icon control', () => {
	it('reveals an SVG-only uploader and preserves the library selection across toggles', () => {
		const { container } = render(
			<SkillForm
				action={action}
				initialValues={{
					name: 'React',
					type: 'frontend',
					icon: 'SiReact|si',
					url: null,
					useColor: false,
					customColor: null,
				}}
			/>,
		);
		const input = container.querySelector<HTMLInputElement>('[name="customIcon"]')!;
		expect(input.disabled).toBe(true);
		const toggle = screen.getByRole('switch', { name: 'Usar icono personalizado' });
		fireEvent.click(toggle);
		expect(input.disabled).toBe(false);
		expect(input.required).toBe(true);
		expect(input.accept).toBe('.svg,image/svg+xml');
		expect(input.closest('[hidden]')).toBeNull();
		expect(new FormData(container.querySelector('form')!).get('useCustomIcon')).toBe('on');
		fireEvent.click(toggle);
		expect(input.disabled).toBe(true);
		const data = new FormData(container.querySelector('form')!);
		expect(data.get('icon')).toBe('SiReact|si');
		expect(data.get('useCustomIcon')).toBeNull();
		expect(data.get('customIcon')).toBeNull();
	});

	it('opens in custom mode with the saved preview and optional replacement', () => {
		const { container } = render(
			<SkillForm
				action={action}
				initialValues={{
					name: 'Custom',
					type: 'tools',
					icon: null,
					customIconUrl:
						'https://icons.public.blob.vercel-storage.com/skill-icons/icon.svg',
					url: null,
					useColor: true,
					customColor: '#123456',
				}}
				customIconPreview={<svg aria-label="Saved icon" />}
			/>,
		);
		expect(
			screen
				.getByRole('switch', { name: 'Usar icono personalizado' })
				.getAttribute('aria-checked'),
		).toBe('true');
		expect(screen.getByLabelText('Saved icon')).toBeTruthy();
		expect(container.querySelector<HTMLInputElement>('[name="customIcon"]')?.required).toBe(
			false,
		);
		expect(container.querySelector<HTMLInputElement>('[name="customColor"]')?.value).toBe(
			'#123456',
		);
	});

	it('reports invalid files and allows a corrected file or library mode', () => {
		render(<SkillForm action={action} />);
		const toggle = screen.getByRole('switch', { name: 'Usar icono personalizado' });
		fireEvent.click(toggle);
		const input = screen.getByLabelText('Archivo del icono') as HTMLInputElement;
		const submit = screen.getByRole('button', { name: 'Crear habilidad' }) as HTMLButtonElement;
		fireEvent.change(input, {
			target: { files: [new File(['image'], 'icon.png', { type: 'image/png' })] },
		});
		expect(screen.getByRole('alert').textContent).toContain('SVG');
		expect(input.getAttribute('aria-invalid')).toBe('true');
		expect(submit.disabled).toBe(true);
		fireEvent.click(toggle);
		expect(submit.disabled).toBe(false);
		fireEvent.click(toggle);
		fireEvent.change(input, {
			target: {
				files: [
					new File([' '.repeat(256 * 1024 + 1)], 'icon.svg', { type: 'image/svg+xml' }),
				],
			},
		});
		expect(screen.getByRole('alert').textContent).toContain('256 KiB');
		fireEvent.change(input, {
			target: { files: [new File(['<svg/>'], 'icon.svg', { type: 'image/svg+xml' })] },
		});
		expect(screen.queryByRole('alert')).toBeNull();
		expect(input.validity.customError).toBe(false);
		expect(submit.disabled).toBe(false);
	});
});
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

const action = async () => ({ error: null });

describe('SkillForm color control', () => {
	it('reveals the picker with its default HEX when switched on', () => {
		const { container } = render(<SkillForm action={action} />);
		expect(container.querySelector('[name="customColor"]')).toBeNull();

		fireEvent.click(screen.getByRole('switch', { name: 'Usar color personalizado' }));
		expect(container.querySelector<HTMLInputElement>('[name="customColor"]')?.value).toBe(
			'#66696d',
		);
		const enabledData = new FormData(container.querySelector('form')!);
		expect(enabledData.get('useColor')).toBe('on');
		expect(enabledData.get('customColor')).toBe('#66696d');

		fireEvent.click(screen.getByRole('switch', { name: 'Usar color personalizado' }));
		expect(container.querySelector('[name="customColor"]')).toBeNull();
		expect(new FormData(container.querySelector('form')!).get('useColor')).toBeNull();
	});

	it('initializes editing from the saved color', () => {
		const { container } = render(
			<SkillForm
				action={action}
				initialValues={{
					name: 'React',
					type: 'frontend',
					icon: 'SiReact|si',
					url: null,
					useColor: true,
					customColor: '#A1B2C3',
				}}
			/>,
		);

		expect(container.querySelector<HTMLInputElement>('[name="customColor"]')?.value).toBe(
			'#a1b2c3',
		);
		expect(
			screen
				.getByRole('switch', { name: 'Usar color personalizado' })
				.getAttribute('aria-checked'),
		).toBe('true');
	});
});
