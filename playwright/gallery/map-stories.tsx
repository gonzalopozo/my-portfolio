'use client';

import { domAnimation, LazyMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import LocationMap from '@/components/public/location-map';

export function MapCardStory({ children }: { children: ReactNode }) {
	return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

export function LocationMapStory() {
	const { setTheme } = useTheme();
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const [loadedTheme, setLoadedTheme] = useState('');
	useEffect(() => {
		function onThemeLoaded(event: Event) {
			if (event instanceof CustomEvent && typeof event.detail?.theme === 'string') {
				setLoadedTheme(event.detail.theme);
			}
		}
		document.addEventListener('portfolio-map-theme-loaded', onThemeLoaded);
		return () => document.removeEventListener('portfolio-map-theme-loaded', onThemeLoaded);
	}, []);

	return (
		<div style={{ margin: 16 }}>
			<button type="button" onClick={() => setTheme('dark')}>
				Set dark map theme
			</button>
			<div style={{ width: 440, height: 300 }}>
				<LocationMap onReady={() => setReady(true)} onError={() => setFailed(true)} />
			</div>
			<p role="status" aria-label="Map readiness">
				{failed ? 'Failed' : ready ? 'Ready' : 'Loading'}
			</p>
			<p role="status" aria-label="Loaded map theme">
				{loadedTheme}
			</p>
		</div>
	);
}
