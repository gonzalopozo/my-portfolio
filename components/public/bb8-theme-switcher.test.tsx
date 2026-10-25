import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animateView, useReducedMotion } from 'motion/react';
import { BB8ThemeSwitcher } from '@/components/public/bb8-theme-switcher';

const themeState = vi.hoisted(() => ({
	theme: 'light',
	resolvedTheme: 'light',
	setTheme: vi.fn(),
}));

vi.mock('next-themes', () => ({ useTheme: () => themeState }));
vi.mock('motion/react', () => ({
	animateView: vi.fn(),
	useReducedMotion: vi.fn(),
}));

const originalViewTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
let finishReveal: () => void;

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	themeState.theme = 'light';
	themeState.resolvedTheme = 'light';
	themeState.setTheme.mockImplementation((theme: string) => {
		themeState.theme = theme;
		themeState.resolvedTheme = theme;
	});
	vi.mocked(useReducedMotion).mockReturnValue(false);
	Object.defineProperty(document, 'startViewTransition', {
		configurable: true,
		value: vi.fn(),
	});

	vi.mocked(animateView).mockImplementation((update) => {
		void update();
		const finished = new Promise<void>((resolve) => {
			finishReveal = resolve;
		});
		// Mirror Motion's chainable, awaitable builder without rendering browser snapshots.
		const builder = Object.assign(Promise.resolve({ finished }), {
			get: vi.fn().mockReturnThis(),
			layout: vi.fn().mockReturnThis(),
			new: vi.fn().mockReturnThis(),
			old: vi.fn().mockReturnThis(),
			enter: vi.fn().mockReturnThis(),
			exit: vi.fn().mockReturnThis(),
			crossfade: vi.fn().mockReturnThis(),
		});
		return builder as unknown as ReturnType<typeof animateView>;
	});
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	if (originalViewTransition) {
		Object.defineProperty(document, 'startViewTransition', originalViewTransition);
	} else {
		Reflect.deleteProperty(document, 'startViewTransition');
	}
});

async function startReveal() {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(250);
		await vi.advanceTimersToNextFrame();
	});
}

describe('BB8ThemeSwitcher', () => {
	it('moves BB8 immediately and reveals the page after its lead-in', async () => {
		render(<BB8ThemeSwitcher />);
		fireEvent.click(screen.getByRole('switch'));

		expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
		expect(themeState.setTheme).not.toHaveBeenCalled();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(249);
		});
		expect(animateView).not.toHaveBeenCalled();

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
			await vi.advanceTimersToNextFrame();
		});
		expect(themeState.setTheme).toHaveBeenCalledExactlyOnceWith('dark');
		expect(animateView).toHaveBeenCalledWith(expect.any(Function), {
			duration: 0.6,
			ease: [0.16, 1, 0.3, 1],
			interrupt: 'immediate',
		});
	});

	it('ignores repeated clicks until the reveal completes', async () => {
		render(<BB8ThemeSwitcher />);
		fireEvent.click(screen.getByRole('switch'));
		fireEvent.click(screen.getByRole('switch'));
		await startReveal();
		fireEvent.click(screen.getByRole('switch'));

		expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
		expect(themeState.setTheme).toHaveBeenCalledTimes(1);

		await act(async () => finishReveal());
		fireEvent.click(screen.getByRole('switch'));
		await startReveal();
		expect(themeState.setTheme).toHaveBeenLastCalledWith('light');
	});

	it('resynchronizes with the resolved theme after a Strict Mode reveal', async () => {
		const { rerender } = render(
			<StrictMode>
				<BB8ThemeSwitcher />
			</StrictMode>,
		);
		fireEvent.click(screen.getByRole('switch'));
		await startReveal();
		await act(async () => finishReveal());

		themeState.theme = 'light';
		themeState.resolvedTheme = 'light';
		rerender(
			<StrictMode>
				<BB8ThemeSwitcher />
			</StrictMode>,
		);

		expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
	});

	it('suppresses competing page transitions only while the reveal runs', async () => {
		render(<BB8ThemeSwitcher />);
		fireEvent.click(screen.getByRole('switch'));
		expect(document.documentElement.hasAttribute('data-bb8-theme-reveal')).toBe(false);

		await startReveal();
		expect(document.documentElement.hasAttribute('data-bb8-theme-reveal')).toBe(true);

		await act(async () => finishReveal());
		expect(document.documentElement.hasAttribute('data-bb8-theme-reveal')).toBe(false);
	});

	it('restores page transitions if unmounted during the reveal', async () => {
		const { unmount } = render(<BB8ThemeSwitcher />);
		fireEvent.click(screen.getByRole('switch'));
		await startReveal();
		unmount();
		expect(document.documentElement.hasAttribute('data-bb8-theme-reveal')).toBe(false);
		await act(async () => finishReveal());
	});

	it.each(['reduced motion', 'unsupported browser'])('switches immediately with %s', (mode) => {
		if (mode === 'reduced motion') {
			vi.mocked(useReducedMotion).mockReturnValue(true);
		} else {
			Reflect.deleteProperty(document, 'startViewTransition');
		}
		render(<BB8ThemeSwitcher />);
		fireEvent.click(screen.getByRole('switch'));

		expect(themeState.setTheme).toHaveBeenCalledExactlyOnceWith('dark');
		expect(animateView).not.toHaveBeenCalled();
	});

	it.each(['lead-in', 'animation frame'])(
		'cancels the pending %s when unmounted',
		async (stage) => {
			const { unmount } = render(<BB8ThemeSwitcher />);
			fireEvent.click(screen.getByRole('switch'));
			if (stage === 'animation frame') {
				await act(async () => {
					await vi.advanceTimersByTimeAsync(250);
				});
			}
			unmount();
			await vi.runAllTimersAsync();

			expect(themeState.setTheme).not.toHaveBeenCalled();
			expect(animateView).not.toHaveBeenCalled();
		},
	);
});
