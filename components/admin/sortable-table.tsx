'use client';

import { type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { RxDragHandleDots2 } from 'react-icons/rx';
import { Button } from '@/components/ui/button';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';

interface SortableTableRowProps {
	children: ReactNode;
	id: number;
	index: number;
	label: string;
	disabled: boolean;
}

export function SortableTableRow({ children, id, index, label, disabled }: SortableTableRowProps) {
	const { ref, handleRef } = useSortable({ id, index, disabled });

	return (
		<TableRow ref={ref}>
			<TableCell>
				<Button
					ref={handleRef}
					type="button"
					variant="secondary"
					size="icon"
					className="size-11 cursor-grab touch-none active:cursor-grabbing"
					aria-label={label}
					disabled={disabled}
				>
					<RxDragHandleDots2 aria-hidden="true" />
				</Button>
			</TableCell>
			{children}
		</TableRow>
	);
}

/** Register the table body within its parent DragDropProvider. */
export function SortableTableBody({ children, id }: { children: ReactNode; id: string }) {
	const { ref } = useDroppable({ id });
	return <TableBody ref={ref}>{children}</TableBody>;
}
