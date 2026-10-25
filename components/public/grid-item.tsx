'use client';

import type { ComponentPropsWithRef } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** @public */
export type GridItemVariant = 'about' | 'project' | 'experience';

interface GridItemProps {
	variant: GridItemVariant;
	cardClassName?: string;
	draggable?: boolean;
	sizing?: 'fixed' | 'natural';
}

type GridItemComponentProps = ComponentPropsWithRef<'div'> & GridItemProps;

const GRID_ITEM_ROOT_CLASS_NAME = [
	'group/grid-item relative isolate overflow-visible',
	'hover:z-20 focus-within:z-20',
	"before:content-[''] before:pointer-events-none before:absolute before:-inset-2 before:z-0 before:rounded-[2.25rem]",
	'before:bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--foreground)_12%,transparent),transparent_62%)]',
	'before:opacity-0 before:blur-lg before:transition-opacity before:duration-500 before:ease-[cubic-bezier(0.16,1,0.3,1)]',
	'hover:before:opacity-60 focus-within:before:opacity-60',
].join(' ');

const GRID_ITEM_CARD_INTERACTION_CLASS_NAME = [
	'relative z-10',
	'shadow-[0_0_0_0_color-mix(in_oklch,var(--foreground)_0%,transparent),0_0_0_0_rgb(2_6_23_/_0),inset_0_0_0_1px_color-mix(in_oklch,var(--border)_0%,transparent)]',
	'transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
	'group-hover/grid-item:shadow-[0_18px_46px_-34px_color-mix(in_oklch,var(--foreground)_22%,transparent),0_10px_24px_-20px_rgb(2_6_23_/_0.24),inset_0_0_0_1px_color-mix(in_oklch,var(--border)_72%,transparent)]',
	'group-focus-within/grid-item:shadow-[0_18px_46px_-34px_color-mix(in_oklch,var(--foreground)_22%,transparent),0_10px_24px_-20px_rgb(2_6_23_/_0.24),inset_0_0_0_1px_color-mix(in_oklch,var(--border)_72%,transparent)]',
].join(' ');

export function GridItem({
	children,
	className,
	cardClassName,
	variant,
	draggable = false,
	sizing = 'fixed',
	ref,
	...props
}: GridItemComponentProps) {
	return (
		<div
			ref={ref}
			className={cn(
				GRID_ITEM_ROOT_CLASS_NAME,
				draggable && 'cursor-grab active:cursor-grabbing',
				className,
			)}
			{...props}
		>
			<Card
				className={cn(
					'min-h-0 min-w-0 gap-0 overflow-hidden rounded-4xl border-0 bg-card p-0 text-card-foreground',
					sizing === 'natural' ? 'h-auto w-full' : 'size-full',
					GRID_ITEM_CARD_INTERACTION_CLASS_NAME,
					{
						'@container/project-card': variant === 'project',
						'@container/experience-card': variant === 'experience',
						'@container-[size]': sizing === 'fixed' && variant !== 'about',
					},
					cardClassName,
				)}
			>
				{children}
			</Card>
		</div>
	);
}
