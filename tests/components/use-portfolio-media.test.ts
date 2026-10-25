import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePortfolioMedia } from '@/components/public/use-portfolio-media';

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function setupMedia(width: number, finePointer: boolean) {
	const listeners = new Map<string, Set<() => void>>();
	let viewportWidth = width;
	let hasFinePointer = finePointer;
	vi.stubGlobal('matchMedia', (query: string) => {
		const subscribers = listeners.get(query) ?? new Set<() => void>();
		listeners.set(query, subscribers);
		return {
			get matches() {
				if (query === '(width < 768px)') return viewportWidth < 768;
				if (query === '(hover: hover) and (pointer: fine)') return hasFinePointer;
				throw new Error(`Unexpected media query: ${query}`);
			},
			addEventListener: (_event: string, callback: () => void) => subscribers.add(callback),
			removeEventListener: (_event: string, callback: () => void) =>
				subscribers.delete(callback),
		};
	});
	return {
		update(nextWidth: number, nextFinePointer: boolean) {
			viewportWidth = nextWidth;
			hasFinePointer = nextFinePointer;
			act(() => {
				for (const callbacks of listeners.values()) {
					for (const callback of callbacks) callback();
				}
			});
		},
		listeners,
	};
}

describe('portfolio responsive media', () => {
	it('shares the 768px boundary with CSS and responds to pointer capability changes', () => {
		const media = setupMedia(767, false);
		const { result, unmount } = renderHook(usePortfolioMedia);
		expect(result.current).toEqual({ isMobile: true, hasDragPointer: false });
		media.update(768, false);
		expect(result.current).toEqual({ isMobile: false, hasDragPointer: false });
		media.update(1440, true);
		expect(result.current).toEqual({ isMobile: false, hasDragPointer: true });
		media.update(390, false);
		expect(result.current).toEqual({ isMobile: true, hasDragPointer: false });
		unmount();
		for (const subscribers of media.listeners.values()) expect(subscribers.size).toBe(0);
	});
});
