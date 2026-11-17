import { act, fireEvent, screen, within } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IconPicker } from '@/components/admin/icon-picker';

vi.mock('@/lib/react-icons-manifest.json', () => ({ default: [] }));

beforeEach(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	);
});
afterEach(() => vi.unstubAllGlobals());

describe('icon picker hydration', () => {
	it('enables the picker only after its popover handler is available', async () => {
		const container = document.createElement('div');
		container.innerHTML = renderToString(<IconPicker />);
		document.body.append(container);
		const picker = within(container).getByRole('combobox', { name: 'Select an icon' });
		let root: Root | undefined;
		try {
			expect(picker).toBeDisabled();
			await act(async () => {
				root = hydrateRoot(container, <IconPicker />);
			});
			expect(picker).toBeEnabled();
			fireEvent.click(picker);
			expect(picker).toHaveAttribute('aria-expanded', 'true');
			expect(screen.getByPlaceholderText('Search icons…')).toBeVisible();
		} finally {
			act(() => root?.unmount());
			container.remove();
		}
	});
});
