'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { animateView, useReducedMotion, type GroupAnimation } from 'motion/react';
import { useTheme } from 'next-themes';

const BB8_VISUAL_LEAD_MS = 250;
const THEME_REVEAL_DURATION_MS = 600;
type ResolvedTheme = 'light' | 'dark';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function subscribeToClientMount(_onStoreChange: () => void) {
	return () => {};
}

function getClientSnapshot() {
	return true;
}

function getServerSnapshot() {
	return false;
}

function getRevealGeometry(originElement: HTMLElement | null) {
	const originRect = originElement?.getBoundingClientRect();
	const x = originRect ? originRect.left + originRect.width / 2 : window.innerWidth / 2;
	const y = originRect ? originRect.top + originRect.height / 2 : window.innerHeight / 2;
	const radius =
		Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 24;

	return {
		from: `circle(0px at ${x}px ${y}px)`,
		to: `circle(${radius}px at ${x}px ${y}px)`,
	};
}

export function BB8ThemeSwitcher() {
	const controlId = useId();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const mounted = useSyncExternalStore(
		subscribeToClientMount,
		getClientSnapshot,
		getServerSnapshot,
	);
	const [optimisticVisualTheme, setOptimisticVisualTheme] = useState<ResolvedTheme | null>(null);
	const shouldReduceMotion = useReducedMotion();
	const switcherRef = useRef<HTMLLabelElement>(null);
	const isComponentMountedRef = useRef(true);
	const isTransitioningRef = useRef(false);
	const themeRevealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const themeRevealFrameRef = useRef<number | null>(null);

	useEffect(() => {
		isComponentMountedRef.current = true;

		return () => {
			isComponentMountedRef.current = false;
			document.documentElement.removeAttribute('data-bb8-theme-reveal');

			if (themeRevealTimeoutRef.current) {
				clearTimeout(themeRevealTimeoutRef.current);
			}
			if (themeRevealFrameRef.current) {
				window.cancelAnimationFrame(themeRevealFrameRef.current);
			}

			isTransitioningRef.current = false;
		};
	}, []);

	const resolvedVisualTheme: ResolvedTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
	const visualTheme = optimisticVisualTheme ?? resolvedVisualTheme;
	const isDark = mounted && visualTheme === 'dark';
	const nextTheme = isDark ? 'light' : 'dark';

	async function revealTheme(
		nextResolvedTheme: ResolvedTheme,
		revealGeometry: ReturnType<typeof getRevealGeometry>,
	) {
		if (shouldReduceMotion || !('startViewTransition' in document)) {
			setTheme(nextResolvedTheme);
			return;
		}

		const durationSeconds = THEME_REVEAL_DURATION_MS / 1000;

		const reveal = animateView(
			() => {
				if (!isComponentMountedRef.current) return;

				document.documentElement.setAttribute('data-bb8-theme-reveal', '');
				setTheme(nextResolvedTheme);
			},
			{
				duration: durationSeconds,
				ease: [0.16, 1, 0.3, 1],
				interrupt: 'immediate',
			},
		)
			.old(
				{
					opacity: [1, 1],
				},
				{
					duration: durationSeconds,
				},
			)
			.new(
				{
					clipPath: [revealGeometry.from, revealGeometry.to],
					opacity: [1, 1],
				},
				{
					duration: durationSeconds,
					ease: [0.16, 1, 0.3, 1],
				},
			);

		// Motion's builder resolves to GroupAnimation, but its installed .then type declares void.
		await Promise.resolve(reveal as unknown as PromiseLike<GroupAnimation>)
			.then((transition) => transition.finished)
			.finally(() => {
				document.documentElement.removeAttribute('data-bb8-theme-reveal');
			});
	}

	async function handleThemeChange() {
		if (!mounted || !resolvedTheme || isTransitioningRef.current) return;

		const nextResolvedTheme = visualTheme === 'dark' ? 'light' : 'dark';
		const revealGeometry = getRevealGeometry(switcherRef.current);

		if (shouldReduceMotion || !('startViewTransition' in document)) {
			setTheme(nextResolvedTheme);
			return;
		}

		isTransitioningRef.current = true;
		setOptimisticVisualTheme(nextResolvedTheme);

		if (themeRevealTimeoutRef.current) {
			clearTimeout(themeRevealTimeoutRef.current);
		}

		themeRevealTimeoutRef.current = setTimeout(() => {
			themeRevealTimeoutRef.current = null;

			themeRevealFrameRef.current = window.requestAnimationFrame(() => {
				themeRevealFrameRef.current = null;

				revealTheme(nextResolvedTheme, revealGeometry).finally(() => {
					isTransitioningRef.current = false;

					if (isComponentMountedRef.current) {
						setOptimisticVisualTheme(null);
					}
				});
			});
		}, BB8_VISUAL_LEAD_MS);
	}

	return (
		<div className="flex size-full min-w-0 items-center justify-center p-2 md:min-h-36 md:px-4 md:pt-4 md:pb-8 lg:pb-10">
			<label
				ref={switcherRef}
				className="bb8-theme-switcher"
				data-theme-preference={theme ?? 'system'}
				htmlFor={controlId}
			>
				<input
					id={controlId}
					className="bb8-theme-switcher__checkbox"
					type="checkbox"
					role="switch"
					checked={isDark}
					disabled={!mounted}
					aria-checked={isDark}
					aria-label={`Switch to ${nextTheme} theme`}
					onChange={handleThemeChange}
				/>
				<span className="bb8-toggle__container" aria-hidden="true">
					<span className="bb8-toggle__scenery">
						<span className="bb8-toggle__star" />
						<span className="bb8-toggle__star" />
						<span className="bb8-toggle__star" />
						<span className="bb8-toggle__star" />
						<span className="bb8-toggle__star" />
						<span className="bb8-toggle__star" />
						<span className="bb8-toggle__star" />
						<span className="tatto-1" />
						<span className="tatto-2" />
						<span className="gomrassen" />
						<span className="hermes" />
						<span className="chenini" />
						<span className="bb8-toggle__cloud" />
						<span className="bb8-toggle__cloud" />
						<span className="bb8-toggle__cloud" />
					</span>
					<span className="bb8">
						<span className="bb8__head-container">
							<span className="bb8__antenna" />
							<span className="bb8__antenna" />
							<span className="bb8__head" />
						</span>
						<span className="bb8__body" />
					</span>
					<span className="artificial__hidden">
						<span className="bb8__shadow" />
					</span>
				</span>
			</label>
		</div>
	);
}
