'use client';

import manifest from '@/lib/react-icons-manifest.json';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useId, useState } from 'react';
import type { IconType } from 'react-icons';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PACK_LOADERS: Record<string, () => Promise<Record<string, any>>> = {
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

const PACK_LABELS: Record<string, string> = {
	fa: 'Font Awesome 5',
	fa6: 'Font Awesome 6',
	io5: 'Ionicons 5',
	di: 'Devicons',
	ri: 'Remix Icons',
	gr: 'Grommet',
	si: 'Simple Icons',
	bi: 'Bootstrap',
	tb: 'Tabler Icons',
	lia: 'Icons8 LineAwesome',
};

function parseIconValue(value: string): { name: string; pack: string } {
	const [name, pack] = value.split('|').map((s) => s.trim());
	return { name, pack };
}

function formatIconValue(name: string, pack: string): string {
	return `${name} | ${pack}`;
}

/* ── Icon preview with async loading ────────────────────────── */

interface IconPreviewProps {
	iconPackage: string;
	iconName: string;
	className?: string;
}

function IconPreview({ iconName, iconPackage, className }: IconPreviewProps) {
	const [loaded, setLoaded] = useState<{
		name: string;
		pack: string;
		Icon: IconType | null;
	} | null>(null);

	useEffect(() => {
		let cancelled = false;
		const loader = PACK_LOADERS[iconPackage];
		if (!loader) return;

		loader().then((mod) => {
			if (cancelled) return;
			const resolved = mod[iconName];
			setLoaded({
				name: iconName,
				pack: iconPackage,
				Icon: typeof resolved === 'function' ? (resolved as IconType) : null,
			});
		});

		return () => {
			cancelled = true;
		};
	}, [iconName, iconPackage]);

	return !(iconPackage in PACK_LOADERS) ? null : loaded?.name === iconName &&
	  loaded?.pack === iconPackage ? (
		loaded.Icon ? (
			<loaded.Icon className={cn('shrink-0', className ?? 'size-4')} aria-hidden />
		) : null
	) : (
		<Skeleton className={cn('rounded-sm', className ?? 'size-4')} />
	);
}

/* ── Skeleton for dynamic import loading ────────────────────── */

export function IconPickerSkeleton() {
	return (
		<div className="flex h-11 w-full items-center gap-3 rounded-md border border-input px-3">
			<Skeleton className="size-8 rounded-md" />
			<div className="flex flex-col gap-1">
				<Skeleton className="h-3.5 w-24" />
				<Skeleton className="h-2.5 w-16" />
			</div>
		</div>
	);
}

/* ── Main component ─────────────────────────────────────────── */

interface IconPickerProps {
	fullName?: string;
}

export function IconPicker({ fullName }: IconPickerProps) {
	const [open, setOpen] = useState(false);
	const [selectedIcon, setSelectedIcon] = useState<string | null>(fullName ?? null);
	const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const listId = useId();

	useEffect(() => {
		const id = setTimeout(() => {
			setDebouncedQuery(searchQuery || null);
		}, 300);
		return () => clearTimeout(id);
	}, [searchQuery]);

	const selected = selectedIcon ? parseIconValue(selectedIcon) : null;

	const filteredIcons = debouncedQuery
		? manifest
				.filter((icon) => icon.name.toLowerCase().includes(debouncedQuery.toLowerCase()))
				.slice(0, 30)
		: [];

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-controls={listId}
						aria-expanded={open}
						aria-haspopup="listbox"
						aria-label={selected ? `Selected icon: ${selected.name}` : 'Select an icon'}
						className={cn(
							'h-auto min-h-11 w-full justify-between px-3 py-2 font-normal',
							!selected && 'text-muted-foreground',
						)}
					>
						{selected ? (
							<span className="flex items-center gap-3">
								<span className="flex size-8 items-center justify-center rounded-md bg-muted">
									<IconPreview
										iconName={selected.name}
										iconPackage={selected.pack}
										className="size-4"
									/>
								</span>
								<span className="flex flex-col items-start gap-0.5">
									<span className="text-sm font-medium text-foreground">
										{selected.name}
									</span>
									<span className="text-xs text-muted-foreground">
										{PACK_LABELS[selected.pack] ?? selected.pack}
									</span>
								</span>
							</span>
						) : (
							<span className="flex items-center gap-3">
								<span className="flex size-8 items-center justify-center rounded-md border border-dashed border-muted-foreground/25">
									<Search
										className="size-3.5 text-muted-foreground/50"
										aria-hidden="true"
									/>
								</span>
								<span className="text-sm">Select an icon…</span>
							</span>
						)}
						<ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
					</Button>
				</PopoverTrigger>

				<PopoverContent className="w-80 p-0" align="start">
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Search icons…"
							value={searchQuery}
							onValueChange={setSearchQuery}
							spellCheck={false}
						/>
						<CommandList id={listId}>
							<CommandEmpty>
								{searchQuery ? (
									<div className="flex flex-col items-center gap-1.5 py-8">
										<Search
											className="size-8 text-muted-foreground/30"
											aria-hidden="true"
										/>
										<p className="mt-1 text-sm font-medium">No icons found</p>
										<p className="text-xs text-muted-foreground">
											Try a different search term…
										</p>
									</div>
								) : (
									<div className="flex flex-col items-center gap-1.5 py-8">
										<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
											<Search
												className="size-5 text-muted-foreground"
												aria-hidden="true"
											/>
										</div>
										<p className="mt-1 text-sm font-medium">
											Search for an icon
										</p>
										<p className="max-w-50 text-xs text-pretty text-muted-foreground">
											Type to search across {Object.keys(PACK_LOADERS).length}{' '}
											icon packs
										</p>
									</div>
								)}
							</CommandEmpty>

							{filteredIcons.length > 0 && (
								<CommandGroup>
									{filteredIcons.map(({ name, pack }) => {
										const value = formatIconValue(name, pack);
										const isSelected = selectedIcon === value;

										return (
											<CommandItem
												key={`${name}-${pack}`}
												value={`${name}-${pack}`}
												onSelect={() => {
													setSelectedIcon(value);
													setOpen(false);
												}}
												className="gap-3"
											>
												<span
													className={cn(
														`flex size-8 items-center justify-center rounded-md transition-colors`,
														isSelected
															? 'bg-primary/10 text-primary'
															: 'bg-muted',
													)}
												>
													<IconPreview
														iconName={name}
														iconPackage={pack}
														className="size-4"
													/>
												</span>
												<span className="flex min-w-0 flex-1 flex-col gap-0.5">
													<span className="truncate text-sm">{name}</span>
													<span className="text-xs text-muted-foreground">
														{PACK_LABELS[pack] ?? pack}
													</span>
												</span>
												{isSelected && (
													<Check
														className="size-4 shrink-0 text-primary"
														aria-hidden="true"
													/>
												)}
											</CommandItem>
										);
									})}
								</CommandGroup>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			<input type="hidden" name="icon" id="icon" value={selectedIcon ?? ''} />
		</>
	);
}
