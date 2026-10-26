'use client';

import { useEffect, useRef, useState } from 'react';

/** Load a visible map after a paint and idle time, canceling work on unmount. */
export function useDeferredMap() {
	const containerRef = useRef<HTMLDivElement>(null);
	const [shouldLoadMap, setShouldLoadMap] = useState(false);

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		let firstFrame: number | undefined;
		let secondFrame: number | undefined;
		let idleCallback: number | undefined;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let scheduled = false;

		function scheduleMap() {
			if (scheduled) return;
			scheduled = true;
			// Give the server-rendered preview a paint before any map work starts.
			firstFrame = requestAnimationFrame(() => {
				secondFrame = requestAnimationFrame(() => {
					if (typeof window.requestIdleCallback === 'function') {
						idleCallback = window.requestIdleCallback(() => setShouldLoadMap(true), {
							timeout: 1500,
						});
					} else {
						timer = setTimeout(() => setShouldLoadMap(true), 150);
					}
				});
			});
		}

		const observer =
			typeof IntersectionObserver === 'undefined'
				? null
				: new IntersectionObserver((entries) => {
						if (!entries.some((entry) => entry.isIntersecting)) return;
						observer?.disconnect();
						scheduleMap();
					});
		if (observer) observer.observe(element);
		else scheduleMap();

		return () => {
			observer?.disconnect();
			if (firstFrame !== undefined) cancelAnimationFrame(firstFrame);
			if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
			if (idleCallback !== undefined) window.cancelIdleCallback(idleCallback);
			if (timer !== undefined) clearTimeout(timer);
		};
	}, []);

	return { containerRef, shouldLoadMap };
}
