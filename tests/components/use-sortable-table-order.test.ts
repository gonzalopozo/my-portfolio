import { act, cleanup, renderHook } from '@testing-library/react';
import { type DragEndEvent } from '@dnd-kit/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSortableTableOrder } from '@/components/admin/use-sortable-table-order';

const mocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('@dnd-kit/react/sortable', () => ({
	isSortable: (source: object | null) => source !== null && 'index' in source,
}));

const serverItems = [
	{ id: 1, order: 1, name: 'GitHub' },
	{ id: 2, order: 2, name: 'LinkedIn' },
	{ id: 3, order: 3, name: 'Website' },
];

function dragEnd(source: { id: number | string; index?: number } | null, canceled = false) {
	return { canceled, operation: { source } } as unknown as Parameters<DragEndEvent>[0];
}

function setup(items = serverItems) {
	const updateOrder = vi.fn<(id: number, newOrder: number) => Promise<string>>();
	updateOrder.mockResolvedValue('GitHub');
	const onSuccess = vi.fn();
	const hook = renderHook(
		({ items }) => useSortableTableOrder({ items, updateOrder, onSuccess }),
		{ initialProps: { items } },
	);
	return { ...hook, updateOrder, onSuccess };
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('sortable table order', () => {
	it.each([
		{ id: 1, index: 2, expectedIds: [2, 3, 1] },
		{ id: 3, index: 0, expectedIds: [3, 1, 2] },
	])(
		'moves item $id to index $index without changing server records',
		async ({ id, index, expectedIds }) => {
			const items = serverItems.map((item) => Object.freeze({ ...item }));
			const { result, updateOrder, onSuccess } = setup(items);

			await act(async () => {
				await result.current.handleDragEnd(dragEnd({ id, index }));
			});

			expect(result.current.items.map((item) => item.id)).toEqual(expectedIds);
			expect(result.current.items.map((item) => item.order)).toEqual([1, 2, 3]);
			expect(items).toEqual(serverItems);
			expect(updateOrder).toHaveBeenCalledWith(id, index + 1);
			expect(onSuccess).toHaveBeenCalledWith('GitHub', index + 1);
			expect(result.current.isSaving).toBe(false);
		},
	);

	it('updates optimistically and blocks overlapping drops, including before a render', async () => {
		const pending = Promise.withResolvers<string>();
		const { result, updateOrder } = setup();
		updateOrder.mockReturnValue(pending.promise);

		act(() => {
			void result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
			void result.current.handleDragEnd(dragEnd({ id: 3, index: 0 }));
		});

		expect(result.current.items.map((item) => item.id)).toEqual([2, 3, 1]);
		expect(result.current.isSaving).toBe(true);
		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 3, index: 0 }));
		});
		expect(updateOrder).toHaveBeenCalledTimes(1);

		await act(async () => {
			pending.resolve('GitHub');
			await pending.promise;
		});
		expect(result.current.isSaving).toBe(false);
	});

	it.each([
		{ reason: 'canceled', event: dragEnd({ id: 1, index: 2 }, true) },
		{ reason: 'unchanged', event: dragEnd({ id: 1, index: 0 }) },
		{ reason: 'missing source', event: dragEnd(null) },
		{ reason: 'non-sortable source', event: dragEnd({ id: 1 }) },
		{ reason: 'unknown item', event: dragEnd({ id: 99, index: 2 }) },
		{ reason: 'string ID', event: dragEnd({ id: '1', index: 2 }) },
		{ reason: 'negative index', event: dragEnd({ id: 1, index: -1 }) },
		{ reason: 'out-of-range index', event: dragEnd({ id: 1, index: 3 }) },
		{ reason: 'fractional index', event: dragEnd({ id: 1, index: 1.5 }) },
		{ reason: 'non-finite index', event: dragEnd({ id: 1, index: NaN }) },
	])('ignores a drop with $reason', async ({ event }) => {
		const { result, updateOrder, onSuccess } = setup();

		await act(async () => {
			await result.current.handleDragEnd(event);
		});

		expect(result.current.items).toEqual(serverItems);
		expect(updateOrder).not.toHaveBeenCalled();
		expect(onSuccess).not.toHaveBeenCalled();
		expect(mocks.error).not.toHaveBeenCalled();
	});

	it('restores server order and reports a failed save', async () => {
		const pending = Promise.withResolvers<string>();
		const { result, updateOrder, onSuccess } = setup();
		updateOrder.mockReturnValueOnce(pending.promise);
		act(() => {
			void result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});
		expect(result.current.items.map((item) => item.id)).toEqual([2, 3, 1]);

		await act(async () => {
			pending.reject(new Error('save failed'));
		});

		expect(result.current.items).toEqual(serverItems);
		expect(result.current.isSaving).toBe(false);
		expect(onSuccess).not.toHaveBeenCalled();
		expect(mocks.error).toHaveBeenCalledWith('Error al actualizar el orden');

		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});
		expect(updateOrder).toHaveBeenCalledTimes(2);
	});

	it('keeps the optimistic order for unchanged server positions and uses fresh record data', async () => {
		const { result, rerender } = setup();
		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});

		rerender({
			items: serverItems.map((item) => ({ ...item, name: `${item.name} updated` })),
		});
		expect(result.current.items.map((item) => item.id)).toEqual([2, 3, 1]);
		expect(result.current.items[2].name).toBe('GitHub updated');
	});

	it('uses the displayed order for a subsequent move', async () => {
		const { result, updateOrder } = setup();
		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});
		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 1, index: 0 }));
		});

		expect(result.current.items).toEqual(serverItems);
		expect(updateOrder).toHaveBeenLastCalledWith(1, 1);
	});

	it('accepts refreshed server order instead of retaining a stale draft', async () => {
		const { result, rerender } = setup();
		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});

		const refreshed = [
			{ ...serverItems[2], order: 1 },
			{ ...serverItems[0], order: 2 },
			{ ...serverItems[1], order: 3 },
		];
		rerender({ items: refreshed });
		expect(result.current.items).toEqual(refreshed);
	});

	it('accepts added and removed server records while a save is pending', async () => {
		const pending = Promise.withResolvers<string>();
		const { result, rerender, updateOrder } = setup();
		updateOrder.mockReturnValue(pending.promise);
		act(() => {
			void result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});

		const refreshed = [serverItems[1], { id: 4, order: 4, name: 'Bluesky' }];
		rerender({ items: refreshed });
		expect(result.current.items).toEqual(refreshed);

		await act(async () => {
			pending.reject(new Error('record removed'));
		});
		expect(result.current.items).toEqual(refreshed);
	});

	it('does not announce success when persistence reports an unchanged position', async () => {
		const { result, updateOrder, onSuccess } = setup();
		updateOrder.mockResolvedValue('');
		await act(async () => {
			await result.current.handleDragEnd(dragEnd({ id: 1, index: 2 }));
		});

		expect(onSuccess).not.toHaveBeenCalled();
		expect(mocks.error).not.toHaveBeenCalled();
	});
});
