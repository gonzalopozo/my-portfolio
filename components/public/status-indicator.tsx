import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { type ProjectStatus } from '@/lib/types';

/** @public */
export type StatusIndicatorProps = HTMLAttributes<HTMLSpanElement> & { status: ProjectStatus };

export const StatusIndicator = ({ className, status }: StatusIndicatorProps) => {
	const bgClass =
		status === 'active'
			? 'bg-status-active'
			: status === 'in-progress'
				? 'bg-status-in-progress'
				: 'bg-status-archived';

	return (
		<span className={cn('relative inline-flex size-2 align-middle', className)}>
			{status !== 'archived' && (
				<span
					className={cn(
						'absolute inline-flex size-full animate-ping rounded-full opacity-75',
						bgClass,
					)}
				/>
			)}
			<span className={cn('relative inline-flex size-2 rounded-full', bgClass)} />
		</span>
	);
};
