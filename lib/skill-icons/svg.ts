import 'server-only';
import { load } from 'cheerio';
import { MAX_SKILL_ICON_BYTES } from '@/lib/schemas/skill-icon';

export interface SkillIconSvgNode {
	tag: string;
	attributes: Record<string, string>;
	children: SkillIconSvgNode[];
}

export class SkillIconValidationError extends Error {
	constructor(
		message = 'El SVG no es compatible. Exporta un SVG sencillo con trazados, sin imágenes, referencias ni efectos.',
	) {
		super(message);
		this.name = 'SkillIconValidationError';
	}
}

const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);
const NUMERIC_ATTRIBUTES = new Set([
	'x',
	'y',
	'x1',
	'y1',
	'x2',
	'y2',
	'cx',
	'cy',
	'r',
	'rx',
	'ry',
	'width',
	'height',
	'stroke-width',
	'stroke-miterlimit',
	'stroke-dashoffset',
	'pathLength',
]);
const MAX_NUMBER_LENGTH = 64;
const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const ATTRIBUTE = /\s+([\w:-]+)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/g;

/** Scan each declaration or comment once, even when its terminator is missing. */
function stripXmlMetadata(source: string): string {
	let cursor = 0;
	if (source.startsWith('<?xml') && /\s/.test(source[5] ?? '')) {
		const end = source.indexOf('?', 6);
		if (end === -1 || source[end + 1] !== '>') throw new SkillIconValidationError();
		cursor = end + 2;
	}
	const parts: string[] = [];
	while (cursor < source.length) {
		const start = source.indexOf('<!--', cursor);
		if (start === -1) {
			parts.push(source.slice(cursor));
			break;
		}
		parts.push(source.slice(cursor, start));
		const end = source.indexOf('-->', start + 4);
		if (end === -1) throw new SkillIconValidationError();
		cursor = end + 3;
	}
	return parts.join('');
}

/** Cheerio repairs malformed XML, so validate balanced, quoted tags first. */
function assertSvgStructure(source: string) {
	const stack: string[] = [];
	const tokens = source.match(/<[^<>]*>|[^<>]+/g) ?? [];
	if (tokens.join('') !== source) throw new SkillIconValidationError();
	let count = 0;
	let roots = 0;
	for (const token of tokens) {
		if (!token.startsWith('<')) {
			if (token.trim() && !['title', 'desc'].includes(stack.at(-1) ?? ''))
				throw new SkillIconValidationError();
			continue;
		}
		const closing = token.match(/^<\/([\w:-]+)\s*>$/);
		if (closing) {
			if (stack.pop() !== closing[1]) throw new SkillIconValidationError();
			continue;
		}
		const opening = token.match(
			/^<([\w:-]+)((?:\s+[\w:-]+\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/?)>$/,
		);
		if (!opening) throw new SkillIconValidationError();
		const [, tag, attributes, selfClosing] = opening;
		if (++count > 1024 || stack.length >= 32) throw new SkillIconValidationError();
		if (stack.length === 0 && (++roots > 1 || tag !== 'svg'))
			throw new SkillIconValidationError();
		if (tag !== 'svg' && tag !== 'g' && tag !== 'title' && tag !== 'desc' && !SHAPES.has(tag))
			throw new SkillIconValidationError();
		if (stack.length && !['svg', 'g'].includes(stack.at(-1)!))
			throw new SkillIconValidationError();
		if (tag === 'svg' && stack.length) throw new SkillIconValidationError();
		const names = [...attributes.matchAll(ATTRIBUTE)].map((match) => match[1]);
		if (new Set(names).size !== names.length) throw new SkillIconValidationError();
		if (!selfClosing) stack.push(tag);
	}
	if (stack.length || roots !== 1) throw new SkillIconValidationError();
}

function isSvgNumber(value: string): boolean {
	return (
		value.length <= MAX_NUMBER_LENGTH && NUMBER.test(value) && Number.isFinite(Number(value))
	);
}

function numericList(value: string): number[] {
	const parts = value.trim().split(/[\s,]+/);
	if (parts.some((part) => !isSvgNumber(part))) throw new SkillIconValidationError();
	return parts.map(Number);
}

/** Sticky matches advance a cursor without retrying earlier transform boundaries. */
function validateTransform(value: string): void {
	const command = /\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)/y;
	let cursor = 0;
	do {
		command.lastIndex = cursor;
		const match = command.exec(value);
		if (!match) throw new SkillIconValidationError();
		numericList(match[2]);
		cursor = command.lastIndex;
	} while (cursor < value.length);
}

function normalizeAttribute(name: string, value: string): string {
	if (name === 'fill' || name === 'stroke') {
		if (/^(none|transparent)$/i.test(value)) return 'none';
		if (value === 'inherit') return value;
		if (!/^(#[\da-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([\d\s.,%+-]+\))$/i.test(value))
			throw new SkillIconValidationError();
		return 'currentColor';
	}
	if (NUMERIC_ATTRIBUTES.has(name)) {
		if (!isSvgNumber(value)) throw new SkillIconValidationError();
		if (
			['r', 'rx', 'ry', 'width', 'height', 'stroke-width', 'pathLength'].includes(name) &&
			Number(value) < 0
		)
			throw new SkillIconValidationError();
		return value;
	}
	if (['opacity', 'fill-opacity', 'stroke-opacity'].includes(name)) {
		if (!isSvgNumber(value) || Number(value) < 0 || Number(value) > 1)
			throw new SkillIconValidationError();
		return value;
	}
	if (name === 'd') {
		if (!value || !/^[MmZzLlHhVvCcSsQqTtAa\d.eE+,\s-]+$/.test(value))
			throw new SkillIconValidationError();
		return value;
	}
	if (name === 'points' || name === 'stroke-dasharray') {
		if (name === 'stroke-dasharray' && value === 'none') return value;
		const numbers = numericList(value);
		if (name === 'points' && (numbers.length < 4 || numbers.length % 2))
			throw new SkillIconValidationError();
		if (name === 'stroke-dasharray' && numbers.some((number) => number < 0))
			throw new SkillIconValidationError();
		return value;
	}
	if (name === 'transform') {
		validateTransform(value);
		return value;
	}
	const enumValues: Record<string, string[]> = {
		'fill-rule': ['nonzero', 'evenodd'],
		'clip-rule': ['nonzero', 'evenodd'],
		'stroke-linecap': ['butt', 'round', 'square'],
		'stroke-linejoin': ['miter', 'round', 'bevel'],
		'vector-effect': ['none', 'non-scaling-stroke'],
	};
	if (!Object.hasOwn(enumValues, name) || !enumValues[name].includes(value))
		throw new SkillIconValidationError();
	return value;
}

type XmlNode = ReturnType<ReturnType<typeof load>['root']>[number]['children'][number];

function normalizeNode(element: XmlNode): SkillIconSvgNode | null {
	if (element.type === 'text') {
		if (element.data.trim()) throw new SkillIconValidationError();
		return null;
	}
	if (element.type !== 'tag') throw new SkillIconValidationError();
	if (element.name === 'title' || element.name === 'desc') return null;
	const attributes: Record<string, string> = {};
	for (const [name, rawValue] of Object.entries(element.attribs)) {
		const value = rawValue.trim();
		if (['id', 'version', 'xmlns', 'xmlns:xlink'].includes(name)) continue;
		if (element.name === 'svg' && ['viewBox', 'width', 'height'].includes(name)) continue;
		if (name !== 'style') attributes[name] = normalizeAttribute(name, value);
	}
	// Inline styles override presentation attributes regardless of XML order.
	if (element.attribs.style) {
		for (const declaration of element.attribs.style.split(';').filter((part) => part.trim())) {
			const [property, value, extra] = declaration.split(':');
			if (!value || extra !== undefined) throw new SkillIconValidationError();
			attributes[property.trim()] = normalizeAttribute(property.trim(), value.trim());
		}
	}
	return {
		tag: element.name,
		attributes,
		children: element.children.map(normalizeNode).filter((node) => node !== null),
	};
}

/** Return a closed SVG tree; no uploaded markup reaches React or Blob unchanged. */
export function normalizeSkillIconSvg(source: string): SkillIconSvgNode {
	if (Buffer.byteLength(source, 'utf8') > MAX_SKILL_ICON_BYTES)
		throw new SkillIconValidationError('El icono no puede superar los 256 KiB.');
	const cleanSource = stripXmlMetadata(source.trim());
	assertSvgStructure(cleanSource);
	const $ = load(cleanSource, { xml: true });
	const root = $('svg').first();
	const icon = normalizeNode(root[0]);
	if (!icon || root.find('path,rect,circle,ellipse,line,polyline,polygon').length === 0)
		throw new SkillIconValidationError();
	const viewBox = root.attr('viewBox');
	if (viewBox !== undefined) {
		const values = numericList(viewBox);
		if (values.length !== 4 || values[2] <= 0 || values[3] <= 0)
			throw new SkillIconValidationError('El SVG necesita un viewBox válido.');
		icon.attributes.viewBox = values.join(' ');
	} else {
		const width = root.attr('width') ?? '';
		const height = root.attr('height') ?? '';
		if (
			!isSvgNumber(width) ||
			!isSvgNumber(height) ||
			Number(width) <= 0 ||
			Number(height) <= 0
		)
			throw new SkillIconValidationError(
				'El SVG necesita un viewBox o dimensiones numéricas válidas.',
			);
		icon.attributes.viewBox = `0 0 ${Number(width)} ${Number(height)}`;
	}
	icon.attributes.fill ??= 'currentColor';
	return icon;
}

export function serializeSkillIconSvg(node: SkillIconSvgNode): string {
	const attributes = Object.entries(node.attributes)
		.map(
			([name, value]) =>
				` ${name}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')}"`,
		)
		.join('');
	const namespace = node.tag === 'svg' ? ' xmlns="http://www.w3.org/2000/svg"' : '';
	return `<${node.tag}${namespace}${attributes}>${node.children.map(serializeSkillIconSvg).join('')}</${node.tag}>`;
}
