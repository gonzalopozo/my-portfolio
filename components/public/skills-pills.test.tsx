import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkillsPills } from '@/components/public/skills-pills';
import type { Skill } from '@/lib/types';

vi.mock('@/components/public/dynamic-icon', () => ({
	DynamicIcon: ({ customIconUrl }: { customIconUrl?: string | null }) => (
		<svg data-custom-icon-url={customIconUrl} />
	),
}));

afterEach(cleanup);

function createSkills(names: string[]): Skill[] {
	return names.map((name, index) => ({
		id: index + 1,
		name,
		icon: null,
		customIconUrl: null,
	}));
}

function getRenderedRows(container: HTMLElement) {
	const root = container.firstElementChild;
	if (!(root instanceof HTMLElement)) return [];

	return Array.from(root.children).filter(
		(child): child is HTMLElement => child instanceof HTMLElement,
	);
}

describe('SkillsPills', () => {
	it('renders custom-only icons through the shared renderer', () => {
		const { container } = render(
			<SkillsPills
				skills={[
					{
						id: 1,
						name: 'Custom',
						icon: null,
						customIconUrl:
							'https://icons.public.blob.vercel-storage.com/skill-icons/icon.svg',
					},
				]}
			/>,
		);
		expect(container.querySelector('svg')?.getAttribute('data-custom-icon-url')).toContain(
			'/skill-icons/',
		);
	});
	it('keeps skill names totaling 18 characters in the same row', () => {
		const { container } = render(
			<SkillsPills skills={createSkills(['TypeScript', 'React', 'CSS'])} />,
		);

		const rows = getRenderedRows(container);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.textContent).toBe('TypeScriptReactCSS');
	});

	it('moves the skill that exceeds the character budget to the next row', () => {
		const { container } = render(
			<SkillsPills skills={createSkills(['TypeScript', 'React', 'Node.js'])} />,
		);

		const rows = getRenderedRows(container);

		expect(rows).toHaveLength(2);
		expect(rows.map((row) => row.textContent)).toEqual(['TypeScriptReact', 'Node.js']);
	});

	it('renders an over-budget skill on its own row', () => {
		const { container } = render(
			<SkillsPills skills={createSkills(['Progressive Web Applications', 'CSS'])} />,
		);

		const rows = getRenderedRows(container);

		expect(rows.map((row) => row.textContent)).toEqual(['Progressive Web Applications', 'CSS']);
	});

	it('appends the hidden count to the final visible row without counting it in the budget', () => {
		const { container } = render(
			<SkillsPills
				skills={createSkills([
					'Progressive Web Applications',
					'TypeScript',
					'React',
					'CSS',
					'Node.js',
				])}
				limit={4}
			/>,
		);

		const rows = getRenderedRows(container);

		expect(rows.map((row) => row.textContent)).toEqual([
			'Progressive Web Applications',
			'TypeScriptReactCSS+1',
		]);
	});

	it('renders a count-only row when the visible limit is zero', () => {
		const { container } = render(<SkillsPills skills={createSkills(['React'])} limit={0} />);

		const rows = getRenderedRows(container);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.textContent).toBe('+1');
	});

	it('keeps responsive wrapping on rows instead of the root container', () => {
		const { container } = render(<SkillsPills skills={createSkills(['React'])} />);
		const root = container.firstElementChild;
		const [row] = getRenderedRows(container);

		expect(root?.classList.contains('flex-wrap')).toBe(false);
		expect(root?.classList.contains('flex-col')).toBe(true);
		expect(row?.classList.contains('flex-wrap')).toBe(true);
	});

	it('renders nothing when there are no skills', () => {
		const { container } = render(<SkillsPills skills={[]} />);

		expect(container.firstChild).toBeNull();
	});
});
