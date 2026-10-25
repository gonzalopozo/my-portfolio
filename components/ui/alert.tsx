import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
	'relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-lg border p-4 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
	{
		variants: {
			variant: {
				default: 'bg-card text-card-foreground',
				destructive:
					'bg-card text-destructive **:data-[slot=alert-description]:text-destructive',
			},
		},
		defaultVariants: { variant: 'default' },
	},
);

function Alert({
	className,
	variant,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
	return (
		<div
			data-slot="alert"
			role="alert"
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	);
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-title"
			className={cn('col-start-2 font-medium tracking-tight', className)}
			{...props}
		/>
	);
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="alert-description"
			className={cn(
				'col-start-2 flex flex-col gap-2 text-sm text-muted-foreground',
				className,
			)}
			{...props}
		/>
	);
}

export { Alert, AlertTitle, AlertDescription };
