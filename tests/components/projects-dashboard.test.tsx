import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectInfo } from '@/lib/types';
import type { ProjectImageActionResult, ProjectImageFeedback } from '@/lib/og-image-feedback';

const toasts = vi.hoisted(() => ({ success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));

interface TableProps {
	projects: ProjectInfo[];
	onDelete: (id: number) => void;
	refreshOgImage: (id: number) => Promise<void>;
	pendingProjectId?: number;
	feedbackProjectId?: number;
	feedbackId?: string;
}

vi.mock('@/components/admin/projects-table', () => ({
	ProjectsTable: ({
		projects,
		onDelete,
		refreshOgImage,
		pendingProjectId,
		feedbackProjectId,
		feedbackId,
	}: TableProps) => (
		<div>
			{projects.map((project) => (
				<div key={project.id}>
					<button
						disabled={pendingProjectId !== undefined}
						aria-describedby={feedbackProjectId === project.id ? feedbackId : undefined}
						onClick={() => void refreshOgImage(project.id)}
					>
						Actualizar imagen Open Graph de {project.title}
					</button>
					<button
						disabled={pendingProjectId !== undefined}
						onClick={() => onDelete(project.id)}
					>
						Eliminar {project.title}
					</button>
				</div>
			))}
		</div>
	),
}));

import { ProjectsDashboard } from '@/components/admin/projects-dashboard';

const project: ProjectInfo = {
	id: 7,
	title: 'Portfolio',
	description: 'Personal portfolio',
	url: 'https://example.com',
	repoUrl: null,
	ogImageUrl: null,
	status: 'active',
	order: 1,
	projectSkills: [],
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
};
const initialFeedback: ProjectImageFeedback = {
	projectId: 7,
	operation: 'create',
	error: {
		code: 'timeout',
		stage: 'page-fetch',
		reference: '11111111-1111-4111-8111-111111111111',
	},
};
const refresh = vi.fn<(id: number) => Promise<ProjectImageActionResult>>();
const onDelete = vi.fn<(id: number) => Promise<ProjectImageActionResult>>();

beforeEach(() => {
	vi.resetAllMocks();
	refresh.mockResolvedValue({ ok: true });
	onDelete.mockResolvedValue({ ok: true });
	window.history.replaceState(null, '', '/dashboard/projects');
});
afterEach(cleanup);

function dashboard(feedback?: ProjectImageFeedback, projects = [project]) {
	return (
		<ProjectsDashboard
			projects={projects}
			initialFeedback={feedback}
			onDelete={onDelete}
			refreshOgImage={refresh}
		/>
	);
}

describe('accessible project image feedback', () => {
	it('shows save warnings inline with retry and a diagnostic reference', () => {
		render(dashboard(initialFeedback));
		const alert = screen.getByRole('alert');
		expect(alert.textContent).toContain('Proyecto guardado');
		expect(alert.textContent).toContain('Portfolio');
		expect(alert.textContent).toContain(initialFeedback.error.reference);
		expect(within(alert).getByRole('button', { name: 'Reintentar imagen' })).toBeTruthy();
		expect(
			screen
				.getByRole('button', { name: /Actualizar imagen/ })
				.getAttribute('aria-describedby'),
		).toBe(alert.id);
	});

	it('clears the warning and URL metadata after a successful retry', async () => {
		window.history.replaceState(
			null,
			'',
			'/dashboard/projects?ogCode=timeout&ogProject=7&filter=active',
		);
		render(dashboard(initialFeedback));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Reintentar imagen' }));
		});
		expect(refresh).toHaveBeenCalledExactlyOnceWith(7);
		expect(screen.queryByRole('alert')).toBeNull();
		expect(screen.getByRole('status').textContent).toBe('Imagen Open Graph actualizada.');
		expect(window.location.search).toBe('?filter=active');
		expect(toasts.success).toHaveBeenCalledExactlyOnceWith('Imagen Open Graph actualizada.');
	});

	it('dismisses a warning without losing keyboard focus', () => {
		window.history.replaceState(null, '', '/dashboard/projects?ogCode=timeout');
		render(dashboard(initialFeedback));
		fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
		expect(screen.queryByRole('alert')).toBeNull();
		expect(window.location.search).toBe('');
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
		expect(toasts.warning).toHaveBeenCalledTimes(1);
		expect(toasts.success).not.toHaveBeenCalled();
		expect(toasts.error).not.toHaveBeenCalled();
	});

	it('displays failed refresh results inline', async () => {
		refresh.mockResolvedValue({ ok: false, error: initialFeedback.error });
		render(dashboard());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /Actualizar imagen/ }));
		});
		expect(screen.getByRole('alert').textContent).toContain('tardó demasiado');
		expect(screen.getByRole('button', { name: 'Reintentar imagen' })).toBeTruthy();
		expect(toasts.error).toHaveBeenCalledExactlyOnceWith(
			'No se pudo actualizar la imagen Open Graph',
			{ description: expect.stringContaining('tardó demasiado') },
		);
		expect(toasts.warning).not.toHaveBeenCalled();
	});

	it('disables image controls and prevents duplicate requests while pending', async () => {
		const pending = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(pending.promise);
		render(dashboard(initialFeedback));
		fireEvent.click(screen.getByRole('button', { name: 'Reintentar imagen' }));
		const retry = screen.getByRole<HTMLButtonElement>('button', { name: 'Reintentar imagen' });
		expect(retry.disabled).toBe(true);
		expect(retry.getAttribute('aria-busy')).toBe('true');
		expect(
			screen.getByRole<HTMLButtonElement>('button', { name: /Actualizar imagen/ }).disabled,
		).toBe(true);
		fireEvent.click(retry);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(toasts.success).not.toHaveBeenCalled();
		expect(toasts.error).not.toHaveBeenCalled();
		expect(toasts.warning).toHaveBeenCalledTimes(1);
		await act(async () => {
			pending.resolve({ ok: true });
			await pending.promise;
		});
		expect(
			screen.getByRole<HTMLButtonElement>('button', { name: /Actualizar imagen/ }).disabled,
		).toBe(false);
	});

	it('uses generic text for rejected requests instead of exception messages', async () => {
		refresh.mockRejectedValueOnce(new Error('SQL credentials secret'));
		render(dashboard());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /Actualizar imagen/ }));
		});
		expect(screen.getByRole('alert').textContent).toContain('No se pudo completar');
		expect(screen.getByRole('alert').textContent).not.toContain('secret');
		expect(screen.getByRole('alert').textContent).not.toContain('Referencia:');
		expect(toasts.error).toHaveBeenCalledExactlyOnceWith(
			'No se pudo actualizar la imagen Open Graph',
			{ description: expect.stringContaining('No se pudo completar') },
		);
		expect(JSON.stringify(toasts.error.mock.calls)).not.toContain('secret');
	});

	it('distinguishes refresh cleanup warnings without offering another refresh', async () => {
		refresh.mockResolvedValue({
			ok: true,
			warning: { ...initialFeedback.error, code: 'delete-failed', stage: 'cleanup' },
		});
		render(dashboard());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /Actualizar imagen/ }));
		});
		expect(screen.getByRole('alert').textContent).toContain('Imagen actualizada');
		expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).toBeNull();
		expect(toasts.warning).toHaveBeenCalledExactlyOnceWith(
			'Imagen actualizada con una advertencia de limpieza',
			{ description: expect.stringContaining('No se pudo eliminar una imagen') },
		);
		expect(toasts.success).not.toHaveBeenCalled();
		expect(toasts.error).not.toHaveBeenCalled();
	});

	it('keeps deletion cleanup warnings visible when the last project disappears', async () => {
		onDelete.mockResolvedValue({
			ok: true,
			warning: { ...initialFeedback.error, code: 'delete-failed', stage: 'cleanup' },
		});
		const view = render(dashboard());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar Portfolio' }));
		});
		view.rerender(dashboard(undefined, []));
		expect(screen.getByRole('alert').textContent).toContain('Proyecto eliminado');
		expect(screen.getByRole('alert').textContent).toContain('Portfolio');
		expect(screen.getByRole('heading', { name: 'No hay proyectos todavía' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).toBeNull();
		expect(toasts.warning).toHaveBeenCalledExactlyOnceWith(
			'Proyecto eliminado con una advertencia de limpieza',
			{ description: expect.stringContaining('No se pudo eliminar una imagen') },
		);
		expect(toasts.success).not.toHaveBeenCalled();
		expect(toasts.error).not.toHaveBeenCalled();
	});

	it('does not offer refresh without a source URL', () => {
		render(dashboard(initialFeedback, [{ ...project, url: null }]));
		expect(screen.getByRole('alert')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).toBeNull();
	});
});

describe('supplementary project image toasts', () => {
	it.each(['create', 'update'] as const)(
		'shows a warning for a %s redirect and keeps inline feedback',
		(operation) => {
			render(dashboard({ ...initialFeedback, operation }));
			expect(toasts.warning).toHaveBeenCalledExactlyOnceWith(
				'Proyecto guardado, pero su imagen no se pudo actualizar',
				{ description: expect.stringContaining('tardó demasiado') },
			);
			expect(JSON.stringify(toasts.warning.mock.calls)).not.toContain(
				initialFeedback.error.reference,
			);
			expect(screen.getByRole('alert')).toBeTruthy();
		},
	);

	it('does not repeat redirect warnings during Strict Mode effects or rerenders', () => {
		const view = render(<StrictMode>{dashboard(initialFeedback)}</StrictMode>);
		view.rerender(<StrictMode>{dashboard({ ...initialFeedback })}</StrictMode>);
		expect(toasts.warning).toHaveBeenCalledTimes(1);
		expect(screen.getByRole('alert')).toBeTruthy();
	});

	it('does not show a toast when the dashboard opens without feedback', () => {
		render(dashboard());
		expect(toasts.success).not.toHaveBeenCalled();
		expect(toasts.warning).not.toHaveBeenCalled();
		expect(toasts.error).not.toHaveBeenCalled();
	});

	it('shows a success toast after deletion', async () => {
		render(dashboard());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar Portfolio' }));
		});
		expect(toasts.success).toHaveBeenCalledExactlyOnceWith('Proyecto eliminado.');
		expect(toasts.warning).not.toHaveBeenCalled();
		expect(toasts.error).not.toHaveBeenCalled();
	});

	it('shows a safe error toast and inline alert when deletion fails', async () => {
		onDelete.mockResolvedValue({
			ok: false,
			error: {
				...initialFeedback.error,
				code: 'project-delete-failed',
				stage: 'persistence',
			},
		});
		render(dashboard());
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Eliminar Portfolio' }));
		});
		expect(toasts.error).toHaveBeenCalledExactlyOnceWith('No se pudo eliminar el proyecto', {
			description: expect.stringContaining('Recarga la página'),
		});
		expect(screen.getByRole('alert').textContent).toContain('No se pudo eliminar el proyecto');
		expect(toasts.success).not.toHaveBeenCalled();
	});
});
