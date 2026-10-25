'use client';

import { ArrowRight } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import {
	portfolioSectionParser,
	type PortfolioSection,
} from '@/components/public/portfolio-sections';
import type { GridItemVariant } from '@/components/public/grid-item';

interface GridItemShowMoreButtonProps {
	variant: GridItemVariant;
	buttonSize?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';
	buttonVariant?: 'default' | 'ghost' | 'outline' | 'secondary' | 'inverse';
	className?: string;
	icon?: 'arrow-right';
	iconOnly?: boolean;
	iconPosition?: 'start' | 'end';
	label?: string;
}

const VARIANT_CONFIG: Record<GridItemVariant, { section: PortfolioSection; label: string }> = {
	about: { section: 'About me', label: '¡Conoce más de mí!' },
	experience: { section: 'Experience', label: '¡Descubre mi experiencia!' },
	project: { section: 'Projects', label: '¡Descubre mis proyectos!' },
};

export function GridItemShowMoreButton({
	variant,
	buttonSize,
	buttonVariant,
	className,
	icon,
	iconOnly,
	iconPosition = 'start',
	label,
}: GridItemShowMoreButtonProps) {
	const [section, setSection] = useQueryState('section', portfolioSectionParser);
	const { section: targetSection, label: defaultLabel } = VARIANT_CONFIG[variant];
	const resolvedLabel = label ?? defaultLabel;
	const Icon = icon === 'arrow-right' ? ArrowRight : null;
	const iconElement = Icon ? (
		<Icon
			data-icon={iconPosition === 'end' ? 'inline-end' : 'inline-start'}
			aria-hidden="true"
		/>
	) : null;
	const labelElement = iconOnly ? (
		<span className="sr-only">{resolvedLabel}</span>
	) : (
		resolvedLabel
	);

	if (section) {
		return null;
	}

	return (
		<Button
			data-portfolio-section-link
			onClick={() => setSection(targetSection)}
			size={buttonSize}
			variant={buttonVariant}
			className={className}
			aria-label={iconOnly ? resolvedLabel : undefined}
		>
			{iconPosition === 'end' ? null : iconElement}
			{labelElement}
			{iconPosition === 'end' ? iconElement : null}
		</Button>
	);
}
