// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
	normalizeSkillIconSvg,
	serializeSkillIconSvg,
	SkillIconValidationError,
} from '@/lib/skill-icons/svg';

describe('custom skill SVG normalization', () => {
	it('normalizes fills and strokes while preserving geometry and empty fills', () => {
		const icon = normalizeSkillIconSvg(
			'<svg viewBox="0 0 24 24"><g fill="#ff0000" transform="translate(1 2)"><path d="M0 0h10v10z"/><circle cx="12" cy="12" r="4" fill="none" stroke="blue" stroke-width="2" opacity="0.5"/></g></svg>',
		);
		const svg = serializeSkillIconSvg(icon);
		expect(svg).toContain('viewBox="0 0 24 24"');
		expect(svg).toContain('fill="currentColor"');
		expect(svg).toContain('stroke="currentColor"');
		expect(svg).toContain('fill="none"');
		expect(svg).toContain('transform="translate(1 2)"');
		expect(svg).toContain('opacity="0.5"');
		expect(svg).not.toContain('#ff0000');
		expect(normalizeSkillIconSvg(svg)).toEqual(icon);
	});

	it('derives a viewBox and accepts safe inline presentation styles', () => {
		const icon = normalizeSkillIconSvg(
			'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><!-- export --><path d="M0 0L10 10" style="fill:none;stroke:#123456;stroke-width:2"/></svg>',
		);
		expect(icon.attributes.viewBox).toBe('0 0 32 16');
		expect(icon.children[0].attributes).toMatchObject({
			fill: 'none',
			stroke: 'currentColor',
			'stroke-width': '2',
		});
	});

	it.each(['0', '+12', '-3', '.5', '-.25', '1.', '+1.25', '1e2', '-2.5E-2'])(
		'accepts SVG numeric notation: %s',
		(value) => {
			const icon = normalizeSkillIconSvg(
				`<svg viewBox="0 0 24 24"><circle cx="${value}" r="1"/></svg>`,
			);
			expect(icon.children[0].attributes.cx).toBe(value);
		},
	);

	it('accepts a numeric token at the 64-character boundary', () => {
		const value = `0.${'0'.repeat(61)}1`;
		expect(value).toHaveLength(64);
		const icon = normalizeSkillIconSvg(
			`<svg viewBox="0 0 24 24"><circle cx="${value}" r="1"/></svg>`,
		);
		expect(icon.children[0].attributes.cx).toBe(value);
	});

	it.each(['1e', '1e+', '.', '+', 'NaN', 'Infinity', '1e309', '0x10', '1..2'])(
		'rejects malformed or non-finite numeric values: %s',
		(value) => {
			expect(() =>
				normalizeSkillIconSvg(
					`<svg viewBox="0 0 24 24"><circle cx="${value}" r="1"/></svg>`,
				),
			).toThrow(SkillIconValidationError);
		},
	);

	const oversizedNumber = `0.${'0'.repeat(62)}1`;
	it.each([
		['geometry', `<svg viewBox="0 0 24 24"><circle cx="${oversizedNumber}" r="1"/></svg>`],
		['opacity', `<svg viewBox="0 0 24 24"><path d="M0 0" opacity="${oversizedNumber}"/></svg>`],
		['viewBox', `<svg viewBox="0 0 ${oversizedNumber} 24"><path d="M0 0"/></svg>`],
		['width', `<svg width="${oversizedNumber}" height="24"><path d="M0 0"/></svg>`],
		['height', `<svg width="24" height="${oversizedNumber}"><path d="M0 0"/></svg>`],
		['points', `<svg viewBox="0 0 24 24"><polyline points="${oversizedNumber} 0 1 1"/></svg>`],
		[
			'dash array',
			`<svg viewBox="0 0 24 24"><path d="M0 0" stroke-dasharray="${oversizedNumber} 1"/></svg>`,
		],
		[
			'transform',
			`<svg viewBox="0 0 24 24"><path d="M0 0" transform="translate(${oversizedNumber})"/></svg>`,
		],
		[
			'inline style',
			`<svg viewBox="0 0 24 24"><path d="M0 0" style="stroke-width:${oversizedNumber}"/></svg>`,
		],
	])('rejects numeric tokens longer than 64 characters in %s', (_, svg) => {
		expect(() => normalizeSkillIconSvg(svg)).toThrow(SkillIconValidationError);
	});

	it.each([
		'matrix(1 0 0 1 2 3)',
		'translate ( +1e1 , -.5 )',
		'scale(.5 2)',
		'rotate(90 12 12)',
		'skewX(10) skewY(-10)',
		'translate(1)scale(2) rotate(3)',
		'matrix(1 2) rotate(1 2)',
	])('preserves supported transform sequences: %s', (value) => {
		const icon = normalizeSkillIconSvg(
			`<svg viewBox="0 0 24 24"><path d="M0 0" transform="${value}"/></svg>`,
		);
		expect(icon.children[0].attributes.transform).toBe(value);
		expect(normalizeSkillIconSvg(serializeSkillIconSvg(icon))).toEqual(icon);
	});

	it.each([
		'',
		'translate()',
		'translate(1',
		'translate(1))',
		'translate((1))',
		'translate(1)x',
		'unknown(1)',
		'translate(1);scale(2)',
		'translate(1),scale(2)',
		'translate(1) scale(2) trailing',
		'translate(1e+)',
		'rotate(Infinity)',
	])('rejects malformed or unsupported transforms: %s', (value) => {
		expect(() =>
			normalizeSkillIconSvg(
				`<svg viewBox="0 0 24 24"><path d="M0 0" transform="${value}"/></svg>`,
			),
		).toThrow(SkillIconValidationError);
	});

	it('strips multiple complete comments and a leading XML declaration', () => {
		const source =
			'<?xml version="1.0"?> <!-- first --><svg viewBox="0 0 24 24"><!-- second --><path d="M0 0"/><!-- third --></svg><!-- last -->';
		expect(normalizeSkillIconSvg(source)).toEqual(
			normalizeSkillIconSvg('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'),
		);
	});

	it.each([
		'<!-- unclosed <svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
		'<?xml version="1.0" <svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
		'<?xml version="1.0"?invalid?><svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
	])('rejects incomplete comments and XML declarations: %s', (svg) => {
		expect(() => normalizeSkillIconSvg(svg)).toThrow(SkillIconValidationError);
	});

	it(
		'bounds adversarial validation time independently of the test process',
		{ timeout: 10_000 },
		() => {
			const validatorPath = fileURLToPath(
				new URL('../../lib/skill-icons/svg.ts', import.meta.url),
			);
			// A parent-enforced deadline can interrupt synchronous regex backtracking.
			const output = execFileSync(
				process.execPath,
				[
					'--conditions=react-server',
					'--require',
					'tsx/cjs',
					'-e',
					`
				const assert = require('node:assert/strict');
				const { normalizeSkillIconSvg, SkillIconValidationError } = require(process.argv[1]);
				const maxBytes = 256 * 1024;
				const cases = [];
				for (const length of [100_000, maxBytes - 128]) {
					const digits = '9'.repeat(length);
					const spaces = ' '.repeat(length);
					cases.push(
						'<svg viewBox="0 0 24 24"><circle cx="' + digits + 'x" r="1"/></svg>',
						'<svg viewBox="0 0 ' + digits + 'x 24"><path d="M0 0"/></svg>',
						'<svg viewBox="0 0 24 24"><path d="M0 0" transform="translate(1)' + spaces + 'x"/></svg>',
						'<svg viewBox="0 0 24 24"><path d="M0 0" transform="translate(' + digits + 'e)"/></svg>',
						'<?xml' + spaces + 'x',
						'<!--'.repeat(Math.floor(length / 4)),
						'<svg' + spaces + 'x>',
					);
				}
				for (const svg of cases) assert.ok(Buffer.byteLength(svg) <= maxBytes);
				const start = performance.now();
				for (const svg of cases) assert.throws(() => normalizeSkillIconSvg(svg), SkillIconValidationError);
				process.stdout.write(JSON.stringify({ cases: cases.length, milliseconds: performance.now() - start }));
				`,
					validatorPath,
				],
				{ encoding: 'utf8', timeout: 5000, killSignal: 'SIGKILL' },
			);
			const result = JSON.parse(output) as { cases: number; milliseconds: number };
			expect(result.cases).toBe(14);
			expect(result.milliseconds).toBeLessThan(1000);
		},
	);

	it.each([
		'<svg viewBox="0 0 24 24"><script>alert(1)</script></svg>',
		'<svg viewBox="0 0 24 24" onload="alert(1)"><path d="M0 0"/></svg>',
		'<svg viewBox="0 0 24 24"><foreignObject/></svg>',
		'<svg viewBox="0 0 24 24"><image href="https://example.com/image.png"/></svg>',
		'<svg viewBox="0 0 24 24"><use href="#shape"/></svg>',
		'<svg viewBox="0 0 24 24"><defs><linearGradient id="paint"/></defs></svg>',
		'<svg viewBox="0 0 24 24"><path d="M0 0" fill="url(#paint)"/></svg>',
		'<svg viewBox="0 0 24 24"><path d="M0 0" style="filter:url(https://example.com)"/></svg>',
		'<svg viewBox="0 0 24 24"><style>path{fill:red}</style></svg>',
		'<svg viewBox="0 0 24 24"><animate attributeName="fill"/></svg>',
		'<!DOCTYPE svg [<!ENTITY icon "test">]><svg viewBox="0 0 24 24"/>',
		'<svg viewBox="0 0 24 24"><path d="M0 0"></svg>',
		'<svg viewBox="0 0 24 24"><path d=M0/></svg>',
		'<svg viewBox="0 0 24 24"/><svg viewBox="0 0 24 24"/>',
		'<svg viewBox="0 0 -1 24"><path d="M0 0"/></svg>',
		'<svg width="100%" height="24"><path d="M0 0"/></svg>',
		'<svg viewBox="0 0 24 24"><circle r="invalid"/></svg>',
		'<svg viewBox="0 0 24 24"/>',
	])('rejects unsafe, unsupported or invalid SVG: %s', (svg) => {
		expect(() => normalizeSkillIconSvg(svg)).toThrow();
	});

	it('bounds bytes, nesting and element counts', () => {
		expect(() => normalizeSkillIconSvg(' '.repeat(256 * 1024 + 1))).toThrow();
		expect(() =>
			normalizeSkillIconSvg(
				`<svg viewBox="0 0 24 24">${'<g>'.repeat(33)}<path d="M0 0"/>${'</g>'.repeat(33)}</svg>`,
			),
		).toThrow();
		expect(() =>
			normalizeSkillIconSvg(
				`<svg viewBox="0 0 24 24">${'<path d="M0 0"/>'.repeat(1025)}</svg>`,
			),
		).toThrow();
	});
});
