import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MapGridItemContent } from '@/components/public/map-grid-item-content';

const map = vi.hoisted(() => ({
	props: null as { onReady: () => void; onError: () => void } | null,
	intersect: null as IntersectionObserverCallback | null,
	disconnect: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
	default: () =>
		function LocationMap(props: NonNullable<typeof map.props>) {
			map.props = props;
			return <span>Live map renderer</span>;
		},
}));
vi.mock('@/components/public/use-portfolio-media', () => ({
	usePortfolioMedia: () => ({ isMobile: true, hasDragPointer: false }),
}));
vi.mock('motion/react', () => ({
	useReducedMotion: () => true,
	AnimatePresence: ({ children }: { children: ReactNode }) => children,
	m: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
}));

beforeEach(() => {
	vi.useFakeTimers();
	map.props = null;
	map.intersect = null;
	map.disconnect.mockClear();
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(callback: IntersectionObserverCallback) {
				map.intersect = callback;
			}
			observe() {}
			disconnect = map.disconnect;
		},
	);
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
		window.setTimeout(() => callback(0), 16),
	);
	vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
	vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) =>
		window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1),
	);
	vi.stubGlobal('cancelIdleCallback', (id: number) => window.clearTimeout(id));
});

afterEach(() => {
	cleanup();
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

function setup() {
	return render(
		<MapGridItemContent fingerIcon={<span>Finger</span>} clickIcon={<span>Click</span>} />,
	);
}

function enterViewport() {
	map.intersect?.(
		[{ isIntersecting: true } as IntersectionObserverEntry],
		{} as IntersectionObserver,
	);
}

describe('deferred location map', () => {
	it('shows the preview and marker before visibility, paint, and idle allow the renderer to load', () => {
		const { container } = setup();
		const marker = screen.getByRole('button', { name: 'Map marker' });
		expect(container.querySelector('[data-location-map]')).toHaveAttribute(
			'data-map-state',
			'preview',
		);
		expect(screen.getByText('Arroyomolinos, Madrid')).toBeInTheDocument();
		expect(screen.queryByText('Live map renderer')).toBeNull();
		act(() => vi.advanceTimersByTime(1000));
		expect(screen.queryByText('Live map renderer')).toBeNull();

		act(() => {
			enterViewport();
			vi.advanceTimersByTime(32);
		});
		expect(screen.queryByText('Live map renderer')).toBeNull();
		act(() => vi.advanceTimersByTime(1));
		expect(screen.getByText('Live map renderer')).toBeInTheDocument();
		act(() => map.props?.onReady());
		expect(container.querySelector('[data-location-map]')).toHaveAttribute(
			'data-map-state',
			'ready',
		);
		expect(screen.getByRole('button', { name: 'Map marker' })).toBe(marker);
	});

	it('keeps the location preview and the same story trigger when map resources fail', () => {
		const { container } = setup();
		const marker = screen.getByRole('button', { name: 'Map marker' });
		act(() => {
			enterViewport();
			vi.advanceTimersByTime(33);
		});
		act(() => map.props?.onError());
		expect(container.querySelector('[data-location-map]')).toHaveAttribute(
			'data-map-state',
			'fallback',
		);
		expect(screen.getByText('Arroyomolinos, Madrid')).toBeInTheDocument();
		expect(screen.queryByText('Live map renderer')).toBeNull();
		expect(screen.getByRole('button', { name: 'Map marker' })).toBe(marker);
	});

	it('uses deferred timers when visibility and idle APIs are unavailable', () => {
		vi.stubGlobal('IntersectionObserver', undefined);
		vi.stubGlobal('requestIdleCallback', undefined);
		setup();
		act(() => vi.advanceTimersByTime(181));
		expect(screen.queryByText('Live map renderer')).toBeNull();
		act(() => vi.advanceTimersByTime(1));
		expect(screen.getByText('Live map renderer')).toBeInTheDocument();
	});

	it('cancels map loading when its card unmounts before the idle callback', () => {
		const { unmount } = setup();
		act(() => {
			enterViewport();
			vi.advanceTimersByTime(32);
		});
		unmount();
		act(() => vi.runAllTimers());
		expect(map.props).toBeNull();
		expect(map.disconnect).toHaveBeenCalled();
	});
});
