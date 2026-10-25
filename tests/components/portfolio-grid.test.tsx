import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { collides, type Layout } from 'react-grid-layout';
import type * as ReactGridLayoutModule from 'react-grid-layout';
import type * as MotionModule from 'motion/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExperienceOverviewGridItemContent } from '@/components/public/experience-overview-grid-item-content';
import { PortfolioGrid } from '@/components/public/portfolio-grid';
import { GridItemShowMoreButton } from '@/components/public/grid-item-show-more-button';

vi.mock('@/components/public/dynamic-icon', () => ({ DynamicIcon: () => null }));

const grid = vi.hoisted(() => ({
	layout: undefined as Layout | undefined,
	width: 1200,
	isMobile: false,
	hasDragPointer: true,
	renderActual: false,
	onDragStop: undefined as ((layout: Layout) => void) | undefined,
}));
vi.mock('@/components/public/use-portfolio-media', () => ({
	usePortfolioMedia: () => ({ isMobile: grid.isMobile, hasDragPointer: grid.hasDragPointer }),
}));
vi.mock('react-grid-layout', async (importOriginal) => {
	const actual = await importOriginal<typeof ReactGridLayoutModule>();
	return {
		...actual,
		useContainerWidth: () => ({ width: grid.width, mounted: true, containerRef: null }),
		GridLayout: (props: ReactGridLayoutModule.GridLayoutProps) => {
			grid.layout = props.layout;
			grid.onDragStop = props.onDragStop as (layout: Layout) => void;
			return grid.renderActual ? (
				<actual.GridLayout {...props} />
			) : (
				<div>{props.children}</div>
			);
		},
	};
});
vi.mock('motion/react', async (importOriginal) => ({
	...(await importOriginal<typeof MotionModule>()),
	useReducedMotion: () => true,
}));
vi.mock('@/components/public/map-grid-item-content', () => ({
	MapGridItemContent: () => <span>Map</span>,
}));
vi.mock('@/components/public/last-track-grid-item-content', () => ({
	LastTrackGridItemContent: () => <span>Music</span>,
}));
vi.mock('@/components/public/hobbies-grid-item-content', () => ({
	HobbiesGridItemContent: () => <span>Hobbies</span>,
}));
vi.mock('@/components/public/bb8-theme-switcher', () => ({
	BB8ThemeSwitcher: () => <input aria-label="Theme control" type="checkbox" />,
}));
vi.mock('@/components/public/info-grid-item-content', () => ({
	InfoGridItemContent: () => <GridItemShowMoreButton variant="about" label="About Me" />,
}));

beforeEach(() => {
	vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	grid.width = 1200;
	grid.isMobile = false;
	grid.hasDragPointer = true;
	grid.renderActual = false;
	vi.restoreAllMocks();
});

function setup(searchParams = '', empty = false) {
	const onUrlUpdate = vi.fn();
	const view = render(
		<NuqsTestingAdapter
			searchParams={searchParams}
			hasMemory
			resetUrlUpdateQueueOnMount={false}
			onUrlUpdate={onUrlUpdate}
		>
			<PortfolioGrid
				infoAboutMe={undefined}
				experienceOverviewCard={<ExperienceOverviewGridItemContent skills={[]} />}
				lastTrack={null}
				projectCards={
					empty
						? []
						: Array.from({ length: 5 }, (_, i) => ({
								id: `project:${i}`,
								content: <p>Project {i}</p>,
							}))
				}
				experienceCards={
					empty
						? []
						: Array.from({ length: 3 }, (_, i) => ({
								id: `experience:${i}`,
								content: <p>Experience {i}</p>,
							}))
				}
				socialLinkCards={
					empty
						? []
						: Array.from({ length: 3 }, (_, i) => ({
								id: `social:${i}`,
								content: <p>Social {i}</p>,
							}))
				}
			/>
		</NuqsTestingAdapter>,
	);
	return { ...view, onUrlUpdate };
}

function select(label: string) {
	fireEvent.click(screen.getByRole('button', { name: `Show ${label} section` }));
}
function cardIds(container: HTMLElement) {
	return [...container.querySelectorAll<HTMLElement>('[data-portfolio-card]')].map(
		(card) => card.dataset.portfolioCard,
	);
}

describe('portfolio navigation', () => {
	it('reveals every project and preserves home card instances and controls', async () => {
		const { container, onUrlUpdate } = setup();
		const theme = screen.getByRole('checkbox', { name: 'Theme control' });
		fireEvent.click(theme);
		expect(cardIds(container)).toHaveLength(10);
		expect(screen.getByText('Full Stack Developer')).toBeTruthy();
		expect(screen.queryByText('Experience 0')).toBeNull();
		select('Projects');
		await waitFor(() => expect(cardIds(container)).toHaveLength(12));
		expect(cardIds(container).filter((id) => id?.startsWith('project:'))).toEqual([
			'project:0',
			'project:1',
			'project:2',
			'project:3',
			'project:4',
		]);
		expect(
			container.querySelector('[data-portfolio-card="info"]')?.getAttribute('data-muted'),
		).toBe('true');
		expect(screen.getByRole('checkbox', { name: 'Theme control' })).toBe(theme);
		expect((theme as HTMLInputElement).checked).toBe(true);
		await waitFor(() =>
			expect(onUrlUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					queryString: '?section=Projects',
					options: expect.objectContaining({
						history: 'push',
						shallow: true,
						scroll: false,
					}),
				}),
			),
		);
		select('All');
		await waitFor(() => expect(cardIds(container)).toHaveLength(10));
		expect(screen.queryByText('Project 3')).toBeNull();
		expect(container.querySelectorAll('[data-muted="true"]')).toHaveLength(0);
		await waitFor(() =>
			expect(onUrlUpdate).toHaveBeenLastCalledWith(
				expect.objectContaining({ queryString: '' }),
			),
		);
	});

	it('replaces additional records when switching between categories', async () => {
		const { container } = setup('?section=Projects');
		select('Experience');
		await waitFor(() => expect(screen.getByText('Experience 2')).toBeTruthy());
		expect(screen.queryByText('Project 3')).toBeNull();
		expect(cardIds(container).slice(0, 4)).toEqual([
			'experience-overview',
			'experience:0',
			'experience:1',
			'experience:2',
		]);
		select('About me');
		await waitFor(() => expect(screen.getByText('Social 2')).toBeTruthy());
		expect(screen.queryByText('Experience 1')).toBeNull();
		expect(
			cardIds(container)
				.slice(0, 8)
				.some((id) => id?.startsWith('project:')),
		).toBe(false);
	});

	it('restores separate home and category drag arrangements', async () => {
		setup();
		const home = grid.layout!.map((item, index) => ({ ...item, y: 100 + index * 12 }));
		act(() => grid.onDragStop!(home));
		select('Projects');
		await waitFor(() => expect(screen.getByText('Project 4')).toBeTruthy());
		const projects = grid.layout!.map((item, index) => ({ ...item, y: 200 + index * 12 }));
		act(() => grid.onDragStop!(projects));
		select('All');
		await waitFor(() => expect(grid.layout!).toEqual(home));
		select('Projects');
		await waitFor(() => expect(grid.layout!).toEqual(projects));
	});

	it.each([
		{ section: 'All', searchParams: '', cardId: 'info' },
		{ section: 'About me', searchParams: '?section=About+me', cardId: 'info' },
		{ section: 'Projects', searchParams: '?section=Projects', cardId: 'project:0' },
		{
			section: 'Experience',
			searchParams: '?section=Experience',
			cardId: 'experience-overview',
		},
	])(
		'resolves drag collisions and restores the $section arrangement',
		async ({ section, searchParams, cardId }) => {
			grid.renderActual = true;
			const { container } = setup(searchParams);
			const before = grid.layout!.map((item) => ({ ...item }));
			const original = before.find(({ i }) => i === cardId)!;
			const card = container.querySelector<HTMLElement>(`[data-portfolio-card="${cardId}"]`)!;
			const parent = card.parentElement!;

			// jsdom has no layout measurements; supply the offset parent used by bounded dragging.
			Object.defineProperty(card, 'offsetParent', { configurable: true, value: parent });
			Object.defineProperty(parent, 'clientHeight', {
				configurable: true,
				get: () => Number.parseFloat(parent.style.height),
			});
			const clientY = 10 + original.h * (34.5 + 16);
			fireEvent.mouseDown(card, { button: 0, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 10, clientY: 20 });
			fireEvent.mouseMove(document, { clientX: 10, clientY });
			fireEvent.mouseUp(document, { button: 0, clientX: 10, clientY });

			const saved = grid.layout!.map((item) => ({ ...item }));
			expect(saved.find(({ i }) => i === cardId)!.y).toBeGreaterThan(original.y);
			expect(
				saved
					.map(({ i, w, h }) => ({ i, w, h }))
					.toSorted((a, b) => a.i.localeCompare(b.i)),
			).toEqual(
				before
					.map(({ i, w, h }) => ({ i, w, h }))
					.toSorted((a, b) => a.i.localeCompare(b.i)),
			);
			for (const [index, item] of saved.entries()) {
				for (const other of saved.slice(index + 1)) {
					expect(collides(item, other)).toBe(false);
				}
			}

			select(section === 'All' ? 'Projects' : 'All');
			await waitFor(() => expect(grid.layout!).not.toEqual(saved));
			select(section);
			await waitFor(() => expect(grid.layout!).toEqual(saved));
		},
	);

	it.each(['?section=Contact', '?section=unknown'])(
		'treats %s as All and keeps the email action',
		(searchParams) => {
			const { container } = setup(searchParams);
			expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-current')).toBe(
				'page',
			);
			expect(cardIds(container)).toHaveLength(10);
			expect(screen.getByRole('link', { name: 'Contact' }).getAttribute('href')).toBe(
				'mailto:pozosanchezgonzalo@gmail.com',
			);
			expect(screen.queryByRole('button', { name: /Contact/ })).toBeNull();
		},
	);

	it('uses show-more buttons for the same query navigation', async () => {
		const { onUrlUpdate } = setup();
		fireEvent.click(screen.getByRole('button', { name: 'About Me' }));
		await waitFor(() => expect(screen.getByText('Social 2')).toBeTruthy());
		await waitFor(() =>
			expect(onUrlUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					queryString: '?section=About+me',
					options: expect.objectContaining({ history: 'push' }),
				}),
			),
		);
		expect(screen.queryByRole('button', { name: 'About Me' })).toBeNull();
	});

	it('uses the real grid across breakpoints and section changes without update loops', async () => {
		grid.renderActual = true;
		const error = vi.spyOn(console, 'error');
		const { container } = setup();
		const info = container.querySelector('[data-portfolio-card="info"]');
		select('Projects');
		await waitFor(() => expect(screen.getByText('Project 4')).toBeTruthy());
		grid.width = 390;
		grid.isMobile = true;
		select('About me');
		await waitFor(() => expect(screen.getByText('Social 2')).toBeTruthy());
		grid.width = 820;
		grid.isMobile = false;
		select('Experience');
		await waitFor(() => expect(screen.getByText('Experience 2')).toBeTruthy());
		grid.width = 1200;
		select('All');
		await waitFor(() => expect(cardIds(container)).toHaveLength(10));
		expect(container.querySelector('[data-portfolio-card="info"]')).not.toBe(info);
		expect(error).not.toHaveBeenCalled();
	});

	it('shows an empty category without inserting placeholder records', () => {
		const { container } = setup('?section=Projects', true);
		expect(screen.getByText('No projects to show yet.')).toBeTruthy();
		expect(cardIds(container)).toHaveLength(6);
		expect(container.querySelectorAll('[data-muted="true"]')).toHaveLength(6);
	});

	it('shows only the selected mobile category, including projects omitted from home', async () => {
		grid.isMobile = true;
		grid.width = 390;
		const { container } = setup();
		expect(cardIds(container)).toEqual([
			'info',
			'experience:0',
			'map',
			'social:0',
			'project:0',
			'experience-overview',
			'project:1',
			'theme',
			'music',
			'hobbies',
		]);
		select('Projects');
		await waitFor(() =>
			expect(cardIds(container)).toEqual(Array.from({ length: 5 }, (_, i) => `project:${i}`)),
		);
		expect(container.querySelectorAll('[data-muted="true"]')).toHaveLength(0);
		select('Experience');
		await waitFor(() =>
			expect(cardIds(container)).toEqual([
				'experience-overview',
				'experience:0',
				'experience:1',
				'experience:2',
			]),
		);
		select('About me');
		await waitFor(() =>
			expect(cardIds(container)).toEqual([
				'info',
				'map',
				'social:0',
				'social:1',
				'social:2',
				'hobbies',
				'theme',
				'music',
			]),
		);
		expect(
			container.querySelectorAll('[data-category="project"], [data-category="experience"]'),
		).toHaveLength(0);
		select('All');
		await waitFor(() => expect(cardIds(container)).toHaveLength(10));
		expect(screen.queryByText('Project 2')).toBeNull();
	});

	it('scrolls to page top and transfers CTA focus without scrolling the heading into view', async () => {
		grid.isMobile = true;
		grid.width = 390;
		const scroll = vi.mocked(window.scrollTo);
		setup();
		const cta = screen.getByRole('button', { name: 'About Me' });
		cta.focus();
		fireEvent.click(cta);
		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'About me' })),
		);
		expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
		const navigation = screen.getByRole('button', { name: 'Show Projects section' });
		navigation.focus();
		fireEvent.click(navigation);
		await waitFor(() => expect(screen.getByRole('heading', { name: 'Projects' })).toBeTruthy());
		expect(document.activeElement).toBe(navigation);
	});

	it('keeps an empty mobile section empty instead of appending home cards', () => {
		grid.isMobile = true;
		const { container } = setup('?section=Projects', true);
		expect(screen.getByText('No projects to show yet.')).toBeTruthy();
		expect(cardIds(container)).toEqual([]);
	});

	it('does not accept desktop drag updates from a coarse pointer', () => {
		grid.hasDragPointer = false;
		setup();
		const before = grid.layout;
		act(() => grid.onDragStop!(before!.map((item) => ({ ...item, y: 100 }))));
		expect(grid.layout).toBe(before);
	});
});
