import { describe, expect, it } from 'vitest';
import {
	createCollectionCards,
	createSectionLayouts,
	getSectionCards,
	isSquarePortfolioCard,
	type BentoBreakpoint,
	type PortfolioGridCard,
} from '@/components/public/portfolio-grid-layout';

const cards: PortfolioGridCard[] = [
	{
		id: 'experience-overview',
		content: null,
		variant: 'experience',
		homeSlot: 'g',
		sizeSlot: 'g',
	},
	{ id: 'info', content: null, variant: 'about', homeSlot: 'a', sizeSlot: 'a' },
	{ id: 'map', content: null, variant: 'about', homeSlot: 'b', sizeSlot: 'b' },
	{ id: 'music', content: null, variant: 'about', homeSlot: 'd', sizeSlot: 'd' },
	{ id: 'theme', content: null, variant: 'about', homeSlot: 'i', sizeSlot: 'i' },
	{ id: 'hobbies', content: null, variant: 'about', homeSlot: 'j', sizeSlot: 'j' },
	...createCollectionCards({
		projects: Array.from({ length: 6 }, (_, i) => ({ id: `project:${i}`, content: null })),
		experiences: Array.from({ length: 3 }, (_, i) => ({
			id: `experience:${i}`,
			content: null,
		})),
		socialLinks: Array.from({ length: 3 }, (_, i) => ({ id: `social:${i}`, content: null })),
	}),
];
const breakpoints: BentoBreakpoint[] = ['lg', 'md'];

describe('portfolio section layouts', () => {
	it('keeps the home limits and shows each matching record exactly once', () => {
		const home = getSectionCards(cards, null, 'lg');
		expect(home).toHaveLength(10);
		expect(home.filter(({ variant }) => variant === 'experience').map(({ id }) => id)).toEqual([
			'experience-overview',
		]);
		expect(home.filter(({ variant }) => variant === 'project')).toHaveLength(3);
		const projects = getSectionCards(cards, 'Projects', 'lg');
		expect(projects).toHaveLength(13);
		expect(new Set(projects.map(({ id }) => id)).size).toBe(projects.length);
		expect(projects.slice(0, 6).map(({ id }) => id)).toEqual(
			Array.from({ length: 6 }, (_, i) => `project:${i}`),
		);
		expect(projects.some(({ id }) => id === 'social:1' || id === 'experience:1')).toBe(false);
	});

	it.each(breakpoints)('keeps every about card first at %s', (breakpoint) => {
		const about = getSectionCards(cards, 'About me', breakpoint);
		expect(about.slice(0, 8).every(({ variant }) => variant === 'about')).toBe(true);
		expect(about.slice(8).every(({ variant }) => variant !== 'about')).toBe(true);
		expect(about[0].id).toBe('info');
	});

	it.each(breakpoints)(
		'creates layouts without overlaps and preserves card sizes at %s',
		(breakpoint) => {
			const home = createSectionLayouts(cards, null)[breakpoint];
			for (const section of [null, 'About me', 'Projects', 'Experience'] as const) {
				const layout = createSectionLayouts(cards, section)[breakpoint];
				for (const item of layout) {
					expect(item.x).toBeGreaterThanOrEqual(0);
					expect(item.x + item.w).toBeLessThanOrEqual(4);
					for (const other of layout.filter(({ i }) => i !== item.i)) {
						expect(
							item.x < other.x + other.w &&
								item.x + item.w > other.x &&
								item.y < other.y + other.h &&
								item.y + item.h > other.y,
						).toBe(false);
					}
				}
				for (const original of home) {
					const item = layout.find(({ i }) => i === original.i)!;
					expect([item.w, item.h]).toEqual([original.w, original.h]);
				}
			}
		},
	);

	it('allows background cards to fill gaps beside taller projects', () => {
		const layout = createSectionLayouts(cards, 'Projects').lg;
		const foreground = layout.filter(({ i }) => i.startsWith('project:'));
		const map = layout.find(({ i }) => i === 'map')!;
		expect(map.y).toBeLessThan(Math.max(...foreground.map(({ y, h }) => y + h)));
	});

	it('handles missing records without phantom slots or mutating inputs', () => {
		const sparse = cards.filter(({ id }) => ['info', 'map', 'project:0'].includes(id));
		const before = structuredClone(sparse);
		expect(getSectionCards(sparse, 'Experience', 'sm')).toHaveLength(0);
		expect(createSectionLayouts(sparse, null).lg).toHaveLength(3);
		expect(sparse).toEqual(before);
		expect(createSectionLayouts([], 'Projects')).toEqual({ lg: [], md: [] });
	});

	it('uses the curated mobile order with two projects and the first published experience', () => {
		expect(getSectionCards(cards, null, 'sm').map(({ id }) => id)).toEqual([
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
		expect(getSectionCards(cards, null, 'lg').some(({ id }) => id === 'experience:0')).toBe(
			false,
		);
	});

	it.each(['About me', 'Projects', 'Experience'] as const)(
		'keeps only matching cards and every published record in the mobile %s section',
		(section) => {
			const selected = getSectionCards(cards, section, 'sm');
			const variant =
				section === 'About me'
					? 'about'
					: section === 'Projects'
						? 'project'
						: 'experience';
			expect(selected.every((card) => card.variant === variant)).toBe(true);
			expect(new Set(selected.map(({ id }) => id))).toEqual(
				new Set(cards.filter((card) => card.variant === variant).map(({ id }) => id)),
			);
			expect(new Set(selected.map(({ id }) => id)).size).toBe(selected.length);
		},
	);

	it('places all mobile About me cards around the requested social pairs', () => {
		const expanded = [
			...cards.filter((card) => card.sizeSlot !== 'e'),
			...createCollectionCards({
				projects: [],
				experiences: [],
				socialLinks: Array.from({ length: 8 }, (_, i) => ({
					id: `social:${i}`,
					content: null,
				})),
			}),
		];
		expect(getSectionCards(expanded, 'About me', 'sm').map(({ id }) => id)).toEqual([
			'info',
			'map',
			'social:0',
			'social:1',
			'social:2',
			'hobbies',
			'social:3',
			'social:4',
			'theme',
			'music',
			'social:5',
			'social:6',
			'social:7',
		]);
	});

	it.each([
		{ count: 0, expected: ['info', 'map', 'hobbies', 'theme', 'music'] },
		{
			count: 2,
			expected: ['info', 'map', 'social:0', 'social:1', 'hobbies', 'theme', 'music'],
		},
		{
			count: 4,
			expected: [
				'info',
				'map',
				'social:0',
				'social:1',
				'social:2',
				'hobbies',
				'social:3',
				'theme',
				'music',
			],
		},
	])('omits unavailable mobile social cards with $count links', ({ count, expected }) => {
		const sparse = [
			...cards.filter((card) => card.sizeSlot !== 'e'),
			...createCollectionCards({
				projects: [],
				experiences: [],
				socialLinks: Array.from({ length: count }, (_, i) => ({
					id: `social:${i}`,
					content: null,
				})),
			}),
		];
		expect(getSectionCards(sparse, 'About me', 'sm').map(({ id }) => id)).toEqual(expected);
	});

	it('pairs only square utility cards and omits missing records without placeholders', () => {
		const sparse = cards.filter(
			({ id }) => !id.startsWith('experience:') && !id.startsWith('social:'),
		);
		const home = getSectionCards(sparse, null, 'sm');
		expect(home.map(({ id }) => id)).toEqual([
			'info',
			'map',
			'project:0',
			'experience-overview',
			'project:1',
			'theme',
			'music',
			'hobbies',
		]);
		expect(home.filter(isSquarePortfolioCard).map(({ id }) => id)).toEqual([
			'map',
			'theme',
			'music',
		]);
		expect(getSectionCards([], null, 'sm')).toEqual([]);
	});
});
