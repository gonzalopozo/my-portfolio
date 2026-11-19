'use client';

import { DragDropProvider } from '@dnd-kit/react';
import { useState } from 'react';
import { ColorPickerField } from '@/components/admin/color-picker';
import { SortableTableBody, SortableTableRow } from '@/components/admin/sortable-table';
import { useSortableTableOrder } from '@/components/admin/use-sortable-table-order';
import { SkillsMultiSelect } from '@/components/skills-multi-select';
import { Table, TableCell } from '@/components/ui/table';

export function ColorPickerStory({ atEdge = false }: { atEdge?: boolean }) {
	const [color, setColor] = useState('#a66135');
	return (
		<div
			style={
				atEdge
					? { position: 'fixed', right: 4, bottom: 4, width: 152 }
					: { width: 220, margin: 24 }
			}
		>
			<ColorPickerField name="color" label="Color" value={color} onChange={setColor} />
		</div>
	);
}

const sortableRows = ['Alpha', 'Bravo', 'Charlie'].map((label, index) => ({
	id: index + 1,
	order: index + 1,
	label,
}));

export function SortableTableStory() {
	const [saved, setSaved] = useState('');
	const { items, handleDragEnd, isSaving } = useSortableTableOrder({
		items: sortableRows,
		updateOrder: async (id) => sortableRows.find((row) => row.id === id)?.label ?? '',
		onSuccess: (label, order) => setSaved(`${label} moved to position ${order}`),
	});

	return (
		<div style={{ margin: 24, maxWidth: 520 }}>
			<DragDropProvider onDragEnd={handleDragEnd}>
				<Table aria-label="Sortable gallery rows" aria-busy={isSaving}>
					<SortableTableBody id="gallery-rows">
						{items.map(({ id, label }, index) => (
							<SortableTableRow
								key={id}
								id={id}
								index={index}
								label={`Move ${label}`}
								disabled={isSaving}
							>
								<TableCell>{label}</TableCell>
							</SortableTableRow>
						))}
					</SortableTableBody>
				</Table>
			</DragDropProvider>
			<p role="status">{saved}</p>
		</div>
	);
}

const availableSkills = [
	{ id: 13, name: 'CSS' },
	{ id: 21, name: 'React' },
	{ id: 34, name: 'TypeScript' },
];

export function SkillsMultiSelectStory() {
	const [submittedIds, setSubmittedIds] = useState<string[] | null>(null);
	return (
		<form
			style={{ margin: 24, maxWidth: 320 }}
			onSubmit={(event) => {
				event.preventDefault();
				const input = new FormData(event.currentTarget).getAll('skillIds');
				setSubmittedIds(input.map(String));
			}}
		>
			<SkillsMultiSelect skills={availableSkills} name="skillIds" />
			<button type="submit" style={{ marginTop: 16 }}>
				Submit skills
			</button>
			<output>
				{submittedIds === null ? 'Pending submission' : JSON.stringify(submittedIds)}
			</output>
		</form>
	);
}
