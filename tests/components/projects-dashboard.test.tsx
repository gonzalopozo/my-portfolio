import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Activity, StrictMode, useLayoutEffect, type MouseEvent } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Action, ExternalToast } from 'sonner';
import type { ProjectInfo } from '@/lib/types';
import type { ProjectImageActionResult, ProjectImageFeedback } from '@/lib/og-image-feedback';

type ToastKind = 'success' | 'warning' | 'error' | 'loading';
interface VisibleToast {
	kind: ToastKind;
	title: string;
	options: ExternalToast;
}
const toasts = vi.hoisted(() => ({
	success: vi.fn(),
	warning: vi.fn(),
	error: vi.fn(),
	loading: vi.fn(),
	dismiss: vi.fn(),
	visible: new Map<string | number, VisibleToast>(),
}));
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
	toasts.visible.clear();
	for (const kind of ['success', 'warning', 'error', 'loading'] as const) {
		toasts[kind].mockImplementation((title: string, options: ExternalToast) => {
			const id = options.id!;
			toasts.visible.set(id, { kind, title, options });
			return id;
		});
	}
	toasts.dismiss.mockImplementation((id: string | number) => toasts.visible.delete(id));
	refresh.mockResolvedValue({ ok: true });
	onDelete.mockResolvedValue({ ok: true });
	window.history.replaceState(null, '', '/dashboard/projects');
});
afterEach(async () => {
	await act(async () => {
		cleanup();
	});
	vi.useRealTimers();
});

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
function activeToast(): VisibleToast {
	expect(toasts.visible.size).toBe(1);
	return [...toasts.visible.values()][0];
}
async function click(name: string | RegExp) {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name }));
	});
}
function detailsAction() {
	const action = activeToast().options.action as Action | undefined;
	if (!action || typeof action.onClick !== 'function') throw new Error('Expected a toast action');
	return action;
}

describe('redirect feedback', () => {
	it.each(['create', 'update'] as const)(
		'shows a named %s warning with persistent details and consumes its URL metadata',
		(operation) => {
			window.history.replaceState(
				null,
				'',
				'/dashboard/projects?ogCode=timeout&ogProject=7&filter=active',
			);
			render(dashboard({ ...initialFeedback, operation }));
			const alert = screen.getByRole('alert');
			expect(alert.textContent).toContain('Proyecto guardado');
			expect(alert.textContent).toContain(initialFeedback.error.reference);
			expect(within(alert).getByRole('button', { name: 'Reintentar imagen' })).toBeTruthy();
			expect(window.location.search).toBe('?filter=active');
			expect(activeToast()).toMatchObject({
				kind: 'warning',
				title: expect.stringContaining('Portfolio'),
				options: { duration: 8000, closeButton: true },
			});
			expect(activeToast().title).not.toContain(initialFeedback.error.reference);
			expect(activeToast().options.description).not.toContain(
				initialFeedback.error.reference,
			);
			expect(detailsAction().label).toBe('Ver detalles');
		},
	);
	it('keeps a single notification through Strict Mode and equivalent rerenders', async () => {
		const view = render(<StrictMode>{dashboard(initialFeedback)}</StrictMode>);
		await act(async () => {});
		expect(toasts.dismiss).not.toHaveBeenCalled();
		const id = activeToast().options.id;
		view.rerender(<StrictMode>{dashboard({ ...initialFeedback })}</StrictMode>);
		expect(activeToast().options.id).toBe(id);
		expect(screen.getByRole('alert')).toBeTruthy();
	});
	it('synchronizes a genuinely new reference with both toast and inline feedback', () => {
		const view = render(dashboard(initialFeedback));
		const firstId = activeToast().options.id;
		const next = {
			...initialFeedback,
			error: {
				...initialFeedback.error,
				code: 'missing-image' as const,
				reference: '22222222-2222-4222-8222-222222222222',
			},
		};
		view.rerender(dashboard(next));
		expect(screen.getByRole('alert').textContent).toContain('no tiene una etiqueta');
		expect(screen.getByRole('alert').textContent).toContain(next.error.reference);
		expect(activeToast().options.id).not.toBe(firstId);
		expect(toasts.dismiss).toHaveBeenCalledWith(firstId);
	});
	it('does not resurrect dismissed feedback on ordinary server rerenders', async () => {
		const view = render(dashboard(initialFeedback));
		await click('Cerrar aviso');
		view.rerender(dashboard({ ...initialFeedback }));
		expect(screen.queryByRole('alert')).toBeNull();
		expect(toasts.visible.size).toBe(0);
		expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }));
	});
	it('does not notify on an ordinary dashboard visit', () => {
		render(dashboard());
		expect(toasts.visible.size).toBe(0);
	});
});

describe('operation toast lifecycle', () => {
	it.each(['refresh', 'delete'] as const)(
		'accepts a %s click as soon as the dashboard commits',
		async (operation) => {
			function ImmediateInteraction() {
				useLayoutEffect(() => {
					screen
						.getByRole<HTMLButtonElement>('button', {
							name:
								operation === 'refresh'
									? /Actualizar imagen/
									: 'Eliminar Portfolio',
						})
						.click();
				}, []);
				return dashboard();
			}
			await act(async () => {
				render(<ImmediateInteraction />);
			});
			expect(operation === 'refresh' ? refresh : onDelete).toHaveBeenCalledExactlyOnceWith(7);
			expect(activeToast().kind).toBe('success');
		},
	);
	it('skips loading for fast operations and names the successful project', async () => {
		vi.useFakeTimers();
		render(dashboard());
		await click(/Actualizar imagen/);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});
		expect(toasts.loading).not.toHaveBeenCalled();
		expect(activeToast()).toMatchObject({
			kind: 'success',
			title: expect.stringContaining('Portfolio'),
			options: { duration: 4000 },
		});
		expect(screen.getByRole('status').textContent).toBe('Imagen Open Graph actualizada.');
	});
	it('updates the same ID from delayed loading to a persistent error', async () => {
		vi.useFakeTimers();
		const pending = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(pending.promise);
		render(dashboard());
		await click(/Actualizar imagen/);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(299);
		});
		expect(toasts.loading).not.toHaveBeenCalled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		const id = activeToast().options.id;
		expect(activeToast()).toMatchObject({ kind: 'loading', options: { duration: Infinity } });
		await act(async () => {
			pending.resolve({ ok: false, error: initialFeedback.error });
		});
		expect(activeToast()).toMatchObject({
			kind: 'error',
			options: { id, duration: Infinity, closeButton: true },
		});
		expect(screen.getByRole('alert').textContent).toContain('tardó demasiado');
		act(() => {
			detailsAction().onClick({
				preventDefault: vi.fn(),
			} as unknown as MouseEvent<HTMLButtonElement>);
		});
		expect(document.activeElement).toBe(screen.getByRole('alert'));
	});
	it('replaces a failed attempt with retry success and does not restore old redirect feedback', async () => {
		const view = render(dashboard(initialFeedback));
		const id = activeToast().options.id;
		await click('Reintentar imagen');
		expect(activeToast()).toMatchObject({
			kind: 'success',
			options: { id, action: undefined, duration: 4000 },
		});
		expect(screen.queryByRole('alert')).toBeNull();
		view.rerender(dashboard({ ...initialFeedback }));
		expect(activeToast().kind).toBe('success');
		expect(screen.queryByRole('alert')).toBeNull();
	});
	it('replaces an existing error with loading immediately when retrying', async () => {
		const pending = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(pending.promise);
		render(dashboard(initialFeedback));
		const id = activeToast().options.id;
		await click('Reintentar imagen');
		expect(activeToast()).toMatchObject({
			kind: 'loading',
			options: { id, closeButton: false },
		});
		await act(async () => {
			pending.resolve({ ok: true });
		});
		expect(activeToast()).toMatchObject({ kind: 'success', options: { id } });
	});
	it('starts a fresh notification after the previous toast was explicitly closed', async () => {
		render(dashboard(initialFeedback));
		const previous = activeToast();
		act(() => {
			previous.options.onDismiss?.({ id: previous.options.id! });
		});
		await click('Reintentar imagen');
		expect(activeToast().kind).toBe('success');
		expect(activeToast().options.id).not.toBe(previous.options.id);
	});
	it('updates an existing toast on failed retries too', async () => {
		refresh.mockResolvedValue({
			ok: false,
			error: { ...initialFeedback.error, code: 'missing-image' },
		});
		render(dashboard(initialFeedback));
		const id = activeToast().options.id;
		await click('Reintentar imagen');
		expect(activeToast()).toMatchObject({ kind: 'error', options: { id, duration: Infinity } });
		expect(screen.getByRole('alert').textContent).toContain('no tiene una etiqueta');
	});
	it('dismisses the previous project notification without touching unrelated admin toasts', async () => {
		const second = { ...project, id: 8, title: 'Another project' };
		render(dashboard(initialFeedback, [project, second]));
		const previousId = activeToast().options.id;
		toasts.error('Unrelated admin notification', { id: 'unrelated' });
		await click('Actualizar imagen Open Graph de Another project');
		expect(toasts.dismiss).toHaveBeenCalledWith(previousId);
		expect(toasts.visible.has('unrelated')).toBe(true);
		expect(
			[...toasts.visible.values()].find((value) => value.kind === 'success')?.title,
		).toContain('Another project');
	});
	it('closing the toast preserves the alert, and closing the alert dismisses its toast', async () => {
		const view = render(dashboard(initialFeedback));
		const notification = activeToast();
		act(() => {
			notification.options.onDismiss?.({ id: notification.options.id! });
		});
		expect(toasts.visible.size).toBe(0);
		expect(screen.getByRole('alert')).toBeTruthy();
		view.rerender(dashboard({ ...initialFeedback }));
		expect(toasts.visible.size).toBe(0);
		await click('Cerrar aviso');
		expect(screen.queryByRole('alert')).toBeNull();
	});
	it('prevents duplicate actions while pending', async () => {
		const pending = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(pending.promise);
		render(dashboard());
		await click(/Actualizar imagen/);
		expect(
			screen.getByRole<HTMLButtonElement>('button', { name: /Actualizar imagen/ }).disabled,
		).toBe(true);
		await click(/Actualizar imagen/);
		expect(refresh).toHaveBeenCalledExactlyOnceWith(7);
		await act(async () => {
			pending.resolve({ ok: true });
		});
		expect(
			screen.getByRole<HTMLButtonElement>('button', { name: /Actualizar imagen/ }).disabled,
		).toBe(false);
	});
	it('keeps successful cleanup warnings separate from failures and retains a deleted project name', async () => {
		onDelete.mockResolvedValue({
			ok: true,
			warning: { ...initialFeedback.error, code: 'delete-failed', stage: 'cleanup' },
		});
		const view = render(dashboard());
		await click('Eliminar Portfolio');
		view.rerender(dashboard(undefined, []));
		expect(activeToast()).toMatchObject({
			kind: 'warning',
			title: expect.stringContaining('Portfolio'),
			options: { duration: 8000 },
		});
		expect(screen.getByRole('alert').textContent).toContain('Proyecto eliminado');
		expect(screen.getByRole('alert').textContent).toContain('Portfolio');
		expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).toBeNull();
	});
	it('does not offer an image retry without a current source', () => {
		render(dashboard(initialFeedback, [{ ...project, url: null }]));
		expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).toBeNull();
	});
});

describe('uncertain outcomes', () => {
	it.each(['refresh', 'delete'] as const)(
		'treats rejected %s requests as unknown, without inventing a reference or a cleanup promise',
		async (operation) => {
			(operation === 'refresh' ? refresh : onDelete).mockRejectedValueOnce(
				new Error('SQL credentials secret'),
			);
			render(dashboard());
			await click(operation === 'refresh' ? /Actualizar imagen/ : 'Eliminar Portfolio');
			expect(activeToast()).toMatchObject({
				kind: 'warning',
				options: { duration: Infinity, closeButton: true },
			});
			expect(detailsAction().label).toBe('Recargar página');
			const text = screen.getByRole('alert').textContent!;
			expect(text).toContain('puede haberse completado');
			expect(text).not.toContain('Referencia:');
			expect(text).not.toContain('automáticamente');
			expect(text).not.toContain('secret');
			expect(JSON.stringify(activeToast())).not.toContain('secret');
			expect(screen.queryByRole('button', { name: 'Reintentar imagen' })).toBeNull();
			expect(screen.getByRole('button', { name: 'Recargar página' })).toBeTruthy();
		},
	);
	it('uses persistent warnings for server uncertainty after both saves and manual refreshes', async () => {
		const uncertain = { ...initialFeedback.error, code: 'persistence-uncertain' as const };
		render(dashboard({ ...initialFeedback, error: uncertain }));
		expect(activeToast()).toMatchObject({ kind: 'warning', options: { duration: Infinity } });
		expect(screen.getByRole('alert').textContent).toContain('Proyecto guardado;');
		refresh.mockResolvedValue({ ok: false, error: uncertain });
		await click(/Actualizar imagen/);
		expect(activeToast()).toMatchObject({ kind: 'warning', options: { duration: Infinity } });
		expect(screen.getByRole('alert').textContent).toContain('No se pudo confirmar');
	});
});

describe('navigation and stale responses', () => {
	it('clears loading timers and ignores rejected responses after unmount', async () => {
		vi.useFakeTimers();
		const pending = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(pending.promise);
		const view = render(dashboard());
		await click(/Actualizar imagen/);
		await act(async () => {
			view.unmount();
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
			pending.reject(new Error('response lost'));
		});
		expect(toasts.loading).not.toHaveBeenCalled();
		expect(toasts.visible.size).toBe(0);
	});
	it('dismisses visible loading on unmount and ignores a late success', async () => {
		vi.useFakeTimers();
		const pending = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(pending.promise);
		const view = render(dashboard());
		await click(/Actualizar imagen/);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(300);
		});
		const id = activeToast().options.id;
		await act(async () => {
			view.unmount();
		});
		expect(toasts.dismiss).toHaveBeenCalledWith(id);
		await act(async () => {
			pending.resolve({ ok: true });
		});
		expect(toasts.success).not.toHaveBeenCalled();
		expect(toasts.visible.size).toBe(0);
	});
	it('dismisses a persistent error when leaving the dashboard', async () => {
		refresh.mockResolvedValue({ ok: false, error: initialFeedback.error });
		const view = render(dashboard());
		await click(/Actualizar imagen/);
		const id = activeToast().options.id;
		await act(async () => {
			view.unmount();
		});
		expect(toasts.dismiss).toHaveBeenCalledWith(id);
		expect(toasts.visible.size).toBe(0);
	});
	it('does not revive consumed feedback when a cached page becomes visible again', async () => {
		const view = render(<Activity mode="visible">{dashboard(initialFeedback)}</Activity>);
		expect(activeToast().kind).toBe('warning');
		await act(async () => {
			view.rerender(<Activity mode="hidden">{dashboard(initialFeedback)}</Activity>);
		});
		expect(toasts.visible.size).toBe(0);
		view.rerender(<Activity mode="visible">{dashboard(initialFeedback)}</Activity>);
		expect(toasts.visible.size).toBe(0);
		expect(screen.queryByRole('alert')).toBeNull();
	});
	it('allows a fresh action after returning to a cached page with an abandoned request', async () => {
		const old = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(old.promise);
		const view = render(<Activity mode="visible">{dashboard()}</Activity>);
		await click(/Actualizar imagen/);
		await act(async () => {
			view.rerender(<Activity mode="hidden">{dashboard()}</Activity>);
		});
		view.rerender(<Activity mode="visible">{dashboard()}</Activity>);
		expect(
			screen.getByRole<HTMLButtonElement>('button', { name: /Actualizar imagen/ }).disabled,
		).toBe(false);
		await click(/Actualizar imagen/);
		expect(activeToast().kind).toBe('success');
		await act(async () => {
			old.resolve({ ok: false, error: initialFeedback.error });
		});
		expect(activeToast().kind).toBe('success');
	});
	it('ignores an old attempt after accepting a newer redirect reference and completing a new attempt', async () => {
		const old = Promise.withResolvers<ProjectImageActionResult>();
		refresh.mockReturnValueOnce(old.promise);
		const view = render(dashboard());
		await click(/Actualizar imagen/);
		view.rerender(dashboard(initialFeedback));
		await click('Reintentar imagen');
		expect(activeToast().kind).toBe('success');
		await act(async () => {
			old.resolve({ ok: false, error: initialFeedback.error });
		});
		expect(activeToast().kind).toBe('success');
		expect(screen.queryByRole('alert')).toBeNull();
	});
});
