// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

/** Convert the source OKLCH tokens into linear sRGB for WCAG luminance. */
function linearRgb(value: string) {
	const match = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(value);
	if (!match) throw new Error(`Unsupported color token: ${value}`);
	const [, lightness, chroma, hue] = match.map(Number);
	const a = chroma * Math.cos((hue * Math.PI) / 180);
	const b = chroma * Math.sin((hue * Math.PI) / 180);
	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	].map((channel) => Math.max(0, Math.min(1, channel)));
}

function luminance(rgb: number[]) {
	return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(a: number[], b: number[]) {
	const first = luminance(a);
	const second = luminance(b);
	return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe.each([':root', '.dark'])('%s theme contrast', (selector) => {
	const block = css.split(`${selector} {`)[1]?.split('}')[0];
	if (!block) throw new Error(`Missing theme: ${selector}`);
	const tokens = Object.fromEntries(
		[...block.matchAll(/--([\w-]+): (oklch\([^)]+\));/g)].map(([, name, value]) => [
			name,
			linearRgb(value),
		]),
	);
	const surfaces = ['background', 'card', 'popover', 'secondary', 'muted', 'accent'];

	it.each(surfaces)('keeps reading text accessible on %s', (surface) => {
		expect(contrast(tokens.foreground, tokens[surface])).toBeGreaterThanOrEqual(7);
		for (const role of [
			'muted-foreground',
			'primary',
			'destructive',
			'status-active',
			'status-in-progress',
			'status-archived',
		]) {
			expect(
				contrast(tokens[role], tokens[surface]),
				`${role} on ${surface}`,
			).toBeGreaterThanOrEqual(4.5);
		}
	});

	it.each([
		['primary-foreground', 'primary'],
		['primary-foreground', 'primary-hover'],
		['primary-foreground', 'primary-pressed'],
		['destructive-foreground', 'destructive'],
		['destructive-foreground', 'destructive-hover'],
		['secondary-foreground', 'secondary'],
		['accent-foreground', 'accent'],
		['sidebar-foreground', 'sidebar'],
		['sidebar-primary-foreground', 'sidebar-primary'],
		['sidebar-accent-foreground', 'sidebar-accent'],
	])('keeps %s readable on %s', (foreground, background) => {
		expect(contrast(tokens[foreground], tokens[background])).toBeGreaterThanOrEqual(4.5);
	});

	it.each(surfaces)('distinguishes input boundaries and focus on %s', (surface) => {
		for (const role of ['input', 'ring']) {
			expect(
				contrast(tokens[role], tokens[surface]),
				`${role} on ${surface}`,
			).toBeGreaterThanOrEqual(3);
		}
	});

	it('keeps media text readable over the brightest possible artwork', () => {
		// Composite the 80% dark scrim over white in sRGB, then linearize again.
		const background = tokens['media-background'].map((channel) => {
			const srgb =
				channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
			const composite = srgb * 0.8 + 0.2;
			return composite <= 0.04045 ? composite / 12.92 : ((composite + 0.055) / 1.055) ** 2.4;
		});
		expect(contrast(tokens['media-foreground'], background)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(tokens['media-primary'], background)).toBeGreaterThanOrEqual(3);
	});
});
