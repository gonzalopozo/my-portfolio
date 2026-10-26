'use client';

import { useEffect } from 'react';
import { Map, useMap } from '@/components/ui/map';

interface LocationMapProps {
	onReady: () => void;
	onError: () => void;
}

function LocationMapStatus({ onReady }: Pick<LocationMapProps, 'onReady'>) {
	const { isLoaded } = useMap();

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
			onError={props.onError}
		>
			<LocationMapStatus onReady={props.onReady} />
		</Map>
	);
}
