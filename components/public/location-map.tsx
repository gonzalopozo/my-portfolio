'use client';

import { useEffect } from 'react';
import { Map, useMap } from '@/components/ui/map';

interface LocationMapProps {
	onReady: () => void;
	onError: () => void;
}

function LocationMapStatus({ onReady, onError }: LocationMapProps) {
	const { map, isLoaded } = useMap();

	useEffect(() => {
		if (!map) return;
		map.on('error', onError);
		const canvas = map.getCanvas();
		canvas.addEventListener('webglcontextlost', onError);
		return () => {
			map.off('error', onError);
			canvas.removeEventListener('webglcontextlost', onError);
		};
	}, [map, onError]);

	useEffect(() => {
		if (isLoaded) onReady();
	}, [isLoaded, onReady]);

	return null;
}

export default function LocationMap(props: LocationMapProps) {
	return (
		<Map
			className="[&_.maplibregl-canvas]:pointer-events-none"
			center={[-3.916, 40.27]}
			zoom={13}
			attributionControl={false}
			interactive={false}
		>
			<LocationMapStatus {...props} />
		</Map>
	);
}
