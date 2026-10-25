'use client';

import { useRef, useState } from 'react';
import { type DragEndEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';
import { toast } from 'sonner';

interface OrderedItem {
	id: number;
	order: number;
}

interface OrderDraft {
	serverItemsKey: string;
	itemOrder: number[];
}

interface SortableTableOrderOptions<T extends OrderedItem> {
	items: T[];
	updateOrder: (id: number, newOrder: number) => Promise<string>;
	onSuccess: (name: string, newOrder: number) => void;
}

function getOrderedItems<T extends OrderedItem>(serverItems: T[], itemOrder: number[] | null) {
	if (!itemOrder) return serverItems;

	const itemsById = new Map(serverItems.map((item) => [item.id, item]));
	const orderedItems: T[] = [];

	for (const itemId of itemOrder) {
		const item = itemsById.get(itemId);
		if (!item) continue;

		orderedItems.push(item);
		itemsById.delete(itemId);
	}

	return [...orderedItems, ...itemsById.values()].map((item, index) => ({
		...item,
		order: index + 1,
	}));
}

/** Keeps optimistic positions only while the server's IDs and orders are unchanged. */
export function useSortableTableOrder<T extends OrderedItem>({
	items: serverItems,
	updateOrder,
	onSuccess,
}: SortableTableOrderOptions<T>) {
	const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const savingRef = useRef(false);
	const serverItemsKey = serverItems.map((item) => `${item.id}:${item.order}`).join(',');
	const itemOrder = orderDraft?.serverItemsKey === serverItemsKey ? orderDraft.itemOrder : null;
	const items = getOrderedItems(serverItems, itemOrder);

	async function handleDragEnd({ operation, canceled }: Parameters<DragEndEvent>[0]) {
		const { source } = operation;
		if (canceled || savingRef.current || !isSortable(source)) return;
		if (typeof source.id !== 'number') return;

		const newIndex = source.index;
		const oldIndex = items.findIndex((item) => item.id === source.id);
		if (
			oldIndex === -1 ||
			!Number.isInteger(newIndex) ||
			newIndex < 0 ||
			newIndex >= items.length ||
			oldIndex === newIndex
		)
			return;

		const reordered = [...items];
		const [moved] = reordered.splice(oldIndex, 1);
		if (!moved) return;
		reordered.splice(newIndex, 0, moved);

		// The ref also blocks a second drop before React renders the disabled handles.
		savingRef.current = true;
		setIsSaving(true);
		setOrderDraft({ serverItemsKey, itemOrder: reordered.map((item) => item.id) });

		try {
			const newOrder = newIndex + 1;
			const name = await updateOrder(moved.id, newOrder);
			if (name) onSuccess(name, newOrder);
		} catch {
			setOrderDraft(null);
			toast.error('Error al actualizar el orden');
		} finally {
			savingRef.current = false;
			setIsSaving(false);
		}
	}

	return { items, handleDragEnd, isSaving };
}
