import { createElement, type CSSProperties, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { cacheLife, cacheTag } from 'next/cache';
import { loadSkillIcon } from '@/lib/skill-icons/storage';
import type { SkillIconSvgNode } from '@/lib/skill-icons/svg';

const PACK_LOADERS = {
	fa: () => import('react-icons/fa'),
	fa6: () => import('react-icons/fa6'),
	io5: () => import('react-icons/io5'),
	di: () => import('react-icons/di'),
	ri: () => import('react-icons/ri'),
	gr: () => import('react-icons/gr'),
	si: () => import('react-icons/si'),
	bi: () => import('react-icons/bi'),
	tb: () => import('react-icons/tb'),
	lia: () => import('react-icons/lia'),
};

interface DynamicIconProps {
	iconFullName: string | null;
	customIconUrl?: string | null;
	className?: string;
	fallback?: ReactNode;
	useColor?: boolean;
	customColor?: string | null;
}

function renderSvgNode(node: SkillIconSvgNode, key: number): ReactNode {
	const attributes = Object.fromEntries(
		Object.entries(node.attributes).map(([name, value]) => [
			name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
			value,
		]),
	);
	return createElement(node.tag, { ...attributes, key }, node.children.map(renderSvgNode));
}

export async function DynamicIcon({
	iconFullName,
	customIconUrl,
	className,
	fallback = null,
	useColor = false,
	customColor,
}: DynamicIconProps) {
	'use cache';
	cacheLife('max');
	cacheTag('dynamic-icons');
	const colorStyle: CSSProperties | undefined =
		useColor && customColor && /^#[0-9a-f]{6}$/i.test(customColor)
			? ({ '--icon-color': customColor } as CSSProperties)
			: undefined;
	if (customIconUrl) {
		const svg = await loadSkillIcon(customIconUrl);
		if (svg) {
			const attributes = Object.fromEntries(
				Object.entries(svg.attributes).map(([name, value]) => [
					name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
					value,
				]),
			);
			return (
				<svg
					{...attributes}
					width="1em"
					height="1em"
					className={className}
					style={colorStyle}
					aria-hidden={true}
					focusable="false"
				>
					{svg.children.map(renderSvgNode)}
				</svg>
			);
		}
		cacheLife('seconds');
	}

	const parts = iconFullName?.split('|').map((value) => value.trim()) ?? [];
	const [iconName, packageName] = parts;

	if (
		parts.length !== 2 ||
		!iconName ||
		!packageName ||
		!Object.hasOwn(PACK_LOADERS, packageName)
	) {
		return fallback;
	}

	const loadPack = PACK_LOADERS[packageName as keyof typeof PACK_LOADERS];
	if (typeof loadPack !== 'function') {
		return fallback;
	}

	const packageImported = await loadPack();
	if (!Object.hasOwn(packageImported, iconName)) return fallback;
	const Icon = (packageImported as Record<string, unknown>)[iconName];
	if (typeof Icon !== 'function') return fallback;
	const ResolvedIcon = Icon as IconType;

	return <ResolvedIcon className={className} style={colorStyle} aria-hidden={true} />;
}
