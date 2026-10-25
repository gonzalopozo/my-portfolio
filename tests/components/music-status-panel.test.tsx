import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/actions/music-status', () => ({ refreshMusicStatus: vi.fn() }));

import { MusicStatusPanel } from '@/components/admin/music-status-panel';
import { refreshMusicStatus } from '@/lib/actions/music-status';
import type { MusicDiagnostics, MusicRefreshState } from '@/lib/music-status';

const diagnostics: MusicDiagnostics = {
	status: 'degraded',
	checkedAt: '2026-10-14T10:00:00.000Z',
	correlationId: 'attempt-id',
	integrations: [
		{ integration: 'lastfm', status: 'success', issues: [] },
		{
			integration: 'spotify-search',
			status: 'failed',
			issues: [
				{
					integration: 'spotify-search',
					operation: 'launch',
					code: 'browser-launch-failed',
				},
			],
		},
		{ integration: 'spotify-artwork', status: 'skipped', issues: [] },
	],
};

afterEach(() => {
	cleanup();
	vi.resetAllMocks();
});

describe('music status panel', () => {
	it('provides a named section, actionable text, and a deployment-log reference', () => {
		render(<MusicStatusPanel diagnostics={diagnostics} />);
		expect(screen.getByRole('region', { name: 'Estado de las integraciones' })).toBeTruthy();
		expect(
			screen.getByRole('heading', { level: 2, name: 'Estado de las integraciones' }),
		).toBeTruthy();
		expect(screen.getByText('Con incidencias')).toBeTruthy();
		expect(screen.getByText(/No se pudo iniciar Chromium/)).toBeTruthy();
		expect(screen.getByText('attempt-id')).toBeTruthy();
	});

	it('identifies empty history and skipped enrichment without reporting an incident', () => {
		render(
			<MusicStatusPanel
				diagnostics={{
					...diagnostics,
					status: 'empty',
					integrations: [
						{ integration: 'lastfm', status: 'empty', issues: [] },
						{ integration: 'spotify-search', status: 'skipped', issues: [] },
						{ integration: 'spotify-artwork', status: 'skipped', issues: [] },
					],
				}}
			/>,
		);
		expect(screen.getByText('Sin canciones recientes')).toBeTruthy();
		expect(screen.getByText(/Esto no es un error/)).toBeTruthy();
		expect(screen.queryByText('Con incidencias')).toBeNull();
	});

	it('announces pending and successful refreshes while keeping the button labelled', async () => {
		let resolveRefresh!: (result: MusicRefreshState) => void;
		vi.mocked(refreshMusicStatus).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRefresh = resolve;
				}),
		);
		render(<MusicStatusPanel diagnostics={diagnostics} />);
		const button = screen.getByRole('button', {
			name: 'Actualizar estado',
		}) as HTMLButtonElement;
		button.focus();
		fireEvent.submit(button.closest('form')!);
		await waitFor(() => expect(button.getAttribute('aria-disabled')).toBe('true'));
		expect(screen.getByRole('status').textContent).toBe('Actualizando estado…');
		fireEvent.submit(button.closest('form')!);
		expect(refreshMusicStatus).toHaveBeenCalledOnce();
		await act(async () => resolveRefresh({ error: null, message: 'Estado actualizado.' }));
		await waitFor(() => expect(button.getAttribute('aria-disabled')).toBe('false'));
		expect(screen.getByRole('status').textContent).toBe('Estado actualizado.');
		expect(document.activeElement).toBe(button);
	});

	it('shows action failures inline with an alert announcement', async () => {
		vi.mocked(refreshMusicStatus).mockResolvedValue({
			error: 'No se pudo actualizar el estado.',
			message: null,
		});
		render(<MusicStatusPanel diagnostics={diagnostics} />);
		fireEvent.submit(
			screen.getByRole('button', { name: 'Actualizar estado' }).closest('form')!,
		);
		await waitFor(() =>
			expect(screen.getByRole('alert').textContent).toBe('No se pudo actualizar el estado.'),
		);
	});
});
