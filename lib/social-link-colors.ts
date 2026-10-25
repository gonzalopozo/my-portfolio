type ColorVariants = {
	lighter: string;
	base: string;
	darker: string;
};

type Direction = 'lighter' | 'darker';

const LIGHTNESS_DIFFERENCE = 29;
const SAFE_MIN_LIGHTNESS = 0.5;
const SAFE_MAX_LIGHTNESS = 99.5;

export function getColorVariants(hex: string): ColorVariants {
	const { h, s, l } = hexToHsl(hex);

	const lighterL = shiftLightness(l, LIGHTNESS_DIFFERENCE, 'lighter');
	const darkerL = shiftLightness(l, LIGHTNESS_DIFFERENCE, 'darker');

	return {
		lighter: hslToHex(h, s, lighterL),
		base: hex.toLowerCase(),
		darker: hslToHex(h, s, darkerL),
	};
}

function shiftLightness(lightness: number, difference: number, direction: Direction): number {
	const distanceToEdge = direction === 'lighter' ? 100 - lightness : lightness;

	const effectiveDifference = Math.min(difference, distanceToEdge * 0.9);

	let newLightness =
		direction === 'lighter' ? lightness + effectiveDifference : lightness - effectiveDifference;

	if (direction === 'lighter' && lightness < SAFE_MAX_LIGHTNESS) {
		newLightness = Math.min(newLightness, SAFE_MAX_LIGHTNESS);
	}

	if (direction === 'darker' && lightness > SAFE_MIN_LIGHTNESS) {
		newLightness = Math.max(newLightness, SAFE_MIN_LIGHTNESS);
	}

	return newLightness;
}

function hexToHsl(hex: string) {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);

	let h = 0;
	let s = 0;

	const l = (max + min) / 2;
	const delta = max - min;

	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));

		switch (max) {
			case r:
				h = 60 * (((g - b) / delta) % 6);
				break;

			case g:
				h = 60 * ((b - r) / delta + 2);
				break;

			case b:
				h = 60 * ((r - g) / delta + 4);
				break;
		}
	}

	if (h < 0) {
		h += 360;
	}

	return {
		h,
		s: s * 100,
		l: l * 100,
	};
}

function hslToHex(h: number, s: number, l: number): string {
	s /= 100;
	l /= 100;

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;

	let r = 0;
	let g = 0;
	let b = 0;

	if (h < 60) {
		[r, g, b] = [c, x, 0];
	} else if (h < 120) {
		[r, g, b] = [x, c, 0];
	} else if (h < 180) {
		[r, g, b] = [0, c, x];
	} else if (h < 240) {
		[r, g, b] = [0, x, c];
	} else if (h < 300) {
		[r, g, b] = [x, 0, c];
	} else {
		[r, g, b] = [c, 0, x];
	}

	const toHex = (value: number) =>
		Math.round((value + m) * 255)
			.toString(16)
			.padStart(2, '0');

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
