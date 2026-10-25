'use client';

import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DEFAULT_SKILL_COLOR } from '@/lib/schemas/skills';

interface SkillColorCellProps {
	color: string | null;
}

export function SkillColorCell({ color }: SkillColorCellProps) {
	if (!color) {
		return <span className="text-muted-foreground">Sin color</span>;
	}

	const isDefaultColor = color.toLowerCase() === DEFAULT_SKILL_COLOR;

	return (
		<div className="flex items-center gap-1.5">
			<div
				role="img"
				aria-label={`Color ${color}`}
				className="size-5 shrink-0 rounded-md"
				style={{ backgroundColor: color }}
			/>
			<span className="font-mono text-xs text-muted-foreground">{color}</span>
			{isDefaultColor ? (
				<TooltipProvider
					delayDuration={250}
					skipDelayDuration={150}
					disableHoverableContent
				>
					<Tooltip>
						<TooltipTrigger
							aria-label="Color por defecto"
							className="inline-flex shrink-0 cursor-help items-center rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
						>
							<Info aria-hidden="true" className="size-3.5 text-destructive" />
						</TooltipTrigger>
						<TooltipContent>Esta skill usa el color por defecto</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : null}
		</div>
	);
}
