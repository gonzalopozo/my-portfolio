import type { StyleSpecification } from 'maplibre-gl';

export const mapStyleURLs = {
	light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
	dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

function mapStyle(name: string, background: string): StyleSpecification {
	return {
		version: 8,
		name,
		sources: {
			location: {
				type: 'geojson',
				data: { type: 'Point', coordinates: [-3.916, 40.27] },
			},
		},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': background } },
			{ id: 'location', type: 'circle', source: 'location', paint: { 'circle-radius': 10 } },
		],
	};
}

export const mapStyles: Readonly<Record<string, StyleSpecification>> = {
	[mapStyleURLs.light]: mapStyle('Gallery light', '#f5f3ed'),
	[mapStyleURLs.dark]: mapStyle('Gallery dark', '#203047'),
};
