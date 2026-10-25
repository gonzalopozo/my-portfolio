import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import { type DragEndEvent } from '@dnd-kit/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsTable } from '@/components/admin/projects-table';
import { SocialLinksTable } from '@/components/admin/social-links-table';
import { type ProjectInfo, type SocialLinkInfo } from '@/lib/types';

interface ProviderProps {
	children: ReactNode;
	onDragEnd: (event: Parameters<DragEndEvent>[0]) => Promise<void>;
}

const mocks = vi.hoisted(() => ({
	provider: vi.fn<(props: ProviderProps) => ReactNode>(),
	sortable: vi.fn(),
	droppable: vi.fn(),
	updateProjectOrder: vi.fn(),
	updateSocialLinkOrder: vi.fn(),
	onDelete: vi.fn(),
	refreshOgImage: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
}));

vi.mock('@/lib/actions/projects', () => ({ updateProjectOrder: mocks.updateProjectOrder }));
vi.mock('@/lib/actions/social-links', () => ({
	updateSocialLinkOrder: mocks.updateSocialLinkOrder,
}));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@dnd-kit/react', async () => {
	const { createContext, useContext } = await import('react');
	const ProviderContext = createContext(false);
	return {
		DragDropProvider: mocks.provider.mockImplementation(({ children }) => (
			<ProviderContext value={true}>{children}</ProviderContext>
		)),
		useDroppable: (input: { id: string }) => {
			if (!useContext(ProviderContext)) throw new Error('Missing drag-and-drop provider');
			mocks.droppable(input);
			return { ref: () => {} };
		},
	};
});
vi.mock('@dnd-kit/react/sortable', () => ({
	isSortable: (source: object | null) => source !== null && 'index' in source,
	useSortable: (input: { id: number; index: number; disabled: boolean }) => {
		mocks.sortable(input);
		return { ref: () => {}, handleRef: () => {} };
	},
}));

const dates = {
	createdAt: new Date('2026-01-01T00:00:00Z'),
	updatedAt: new Date('2026-01-01T00:00:00Z'),
};
const socialLinks: SocialLinkInfo[] = ['GitHub', 'LinkedIn'].map((name, index) => ({
	id: index + 1,
	name,
	url: `https://example.com/${index + 1}`,
	icon: 'SiGithub | si',
	color: '#123456',
	order: index + 1,
	...dates,
}));
const projects: ProjectInfo[] = ['Portfolio', 'Dashboard'].map((title, index) => ({
	id: index + 1,
	title,
	description: 'Project description',
	url: `https://example.com/${index + 1}`,
	repoUrl: null,
	ogImageUrl: null,
	status: 'active',
	order: index + 1,
	projectSkills: [],
	...dates,
}));

function dropFirstRowToSecond() {
	const [props] = mocks.provider.mock.calls[mocks.provider.mock.calls.length - 1];
	return props.onDragEnd({
		canceled: false,
		operation: { source: { id: 1, index: 1 } },
	} as unknown as Parameters<DragEndEvent>[0]);
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.updateProjectOrder.mockResolvedValue('Portfolio');
	mocks.updateSocialLinkOrder.mockResolvedValue('GitHub');
	mocks.onDelete.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe.each([
	{
		entity: 'social links',
		firstName: 'GitHub',
		secondName: 'LinkedIn',
		dashboardPath: 'social-links',
		updateOrder: mocks.updateSocialLinkOrder,
		successMessage: 'Enlace "GitHub" actualizado a la posición 2',
		renderTable: () => <SocialLinksTable socialLinks={socialLinks} onDelete={mocks.onDelete} />,
	},
	{
		entity: 'projects',
		firstName: 'Portfolio',
		secondName: 'Dashboard',
		dashboardPath: 'projects',
		updateOrder: mocks.updateProjectOrder,
		successMessage: 'Proyecto "Portfolio" actualizado a la posición 2',
		renderTable: () => (
			<ProjectsTable
				projects={projects}
				onDelete={mocks.onDelete}
				refreshOgImage={mocks.refreshOgImage}
			/>
		),
	},
])(
	'$entity sortable table',
	({ firstName, secondName, dashboardPath, updateOrder, successMessage, renderTable }) => {
		it('keeps edit, external-link, and delete actions with accessible drag handles', () => {
			render(renderTable());
			const firstRow = within(screen.getAllByRole('row')[1]);
			expect(firstRow.getByRole('link', { name: 'Editar' }).getAttribute('href')).toBe(
				`/dashboard/${dashboardPath}/1/edit`,
			);
			expect(
				firstRow.getByRole('button', { name: new RegExp(`Reordenar.*${firstName}`) }),
			).toBeTruthy();
			const externalLink = firstRow
				.getAllByRole('link')
				.find((link) => link.getAttribute('href') === 'https://example.com/1');
			expect(externalLink?.getAttribute('target')).toBe('_blank');
			expect(externalLink?.getAttribute('rel')).toBe('noopener noreferrer');
			fireEvent.click(firstRow.getByRole('button', { name: 'Eliminar' }));
			expect(mocks.onDelete).toHaveBeenCalledWith(1);
			expect(mocks.droppable).toHaveBeenCalledWith({ id: dashboardPath });
		});

		it('saves a dropped row through its own action and displays the resulting positions', async () => {
			render(renderTable());
			await act(async () => {
				await dropFirstRowToSecond();
			});

			const rows = screen.getAllByRole('row').slice(1);
			expect(rows.map((row) => within(row).getAllByRole('cell')[2].textContent)).toEqual([
				secondName,
				firstName,
			]);
			expect(rows.map((row) => within(row).getAllByRole('cell')[1].textContent)).toEqual([
				'1',
				'2',
			]);
			expect(updateOrder).toHaveBeenCalledWith(1, 2);
			expect(mocks.success).toHaveBeenCalledWith(successMessage);
		});

		it('disables drag handles until persistence finishes', async () => {
			const pending = Promise.withResolvers<string>();
			updateOrder.mockReturnValueOnce(pending.promise);
			render(renderTable());
			act(() => {
				void dropFirstRowToSecond();
			});

			for (const handle of screen.getAllByRole<HTMLButtonElement>('button', {
				name: /Reordenar/,
			}))
				expect(handle.disabled).toBe(true);
			expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
			expect(mocks.sortable).toHaveBeenCalledWith({ id: 1, index: 1, disabled: true });

			await act(async () => {
				pending.resolve(firstName);
				await pending.promise;
			});
			for (const handle of screen.getAllByRole<HTMLButtonElement>('button', {
				name: /Reordenar/,
			}))
				expect(handle.disabled).toBe(false);
		});
	},
);

describe('project image controls', () => {
	it('names the refresh action and connects pending controls to inline feedback', () => {
		render(
			<ProjectsTable
				projects={projects}
				onDelete={mocks.onDelete}
				refreshOgImage={mocks.refreshOgImage}
				pendingProjectId={1}
				feedbackProjectId={1}
				feedbackId="image-feedback"
			/>,
		);
		const refresh = screen.getByRole<HTMLButtonElement>('button', {
			name: 'Actualizar imagen Open Graph de Portfolio',
		});
		expect(refresh.disabled).toBe(true);
		expect(refresh.getAttribute('aria-busy')).toBe('true');
		expect(refresh.getAttribute('aria-describedby')).toBe('image-feedback');
		expect(screen.getByRole('table').getAttribute('aria-busy')).toBe('true');
	});
});
