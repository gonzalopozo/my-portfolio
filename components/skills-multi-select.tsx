'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, ListFilter, X } from 'lucide-react';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const EMPTY_SELECTED_IDS: number[] = [];

interface Skill {
	id: number;
	name: string;
}

interface SkillsMultiSelectProps {
	skills: Skill[];
	/** Name attribute for form submission */
	name?: string;
	/** Initial selected skill IDs */
	defaultValue?: number[];
	/** Placeholder text */
	placeholder?: string;
}

export function SkillsMultiSelect({
	skills,
	name = 'skills',
	defaultValue = EMPTY_SELECTED_IDS,
	placeholder = 'Search skills…',
}: SkillsMultiSelectProps) {
	const [open, setOpen] = useState(false);
	const [selectedIdsOverride, setSelectedIdsOverride] = useState<number[] | null>(null);
	const selectedIds = selectedIdsOverride ?? defaultValue;

	const handleSelect = (skillId: number) => {
		setSelectedIdsOverride((current) => {
			const currentSelectedIds = current ?? defaultValue;

			return currentSelectedIds.includes(skillId)
				? currentSelectedIds.filter((id) => id !== skillId)
				: [...currentSelectedIds, skillId];
		});
	};

	const handleClear = (e: React.MouseEvent) => {
		e.stopPropagation();
		setSelectedIdsOverride([]);
	};

	const selectedSkills = skills.filter((skill) => selectedIds.includes(skill.id));

	return (
		<>
			{/* Hidden inputs for form submission */}
			{selectedIds.map((id) => (
				<input key={id} type="hidden" name={name} value={id} />
			))}

			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<div
						role="combobox"
						aria-expanded={open}
						aria-haspopup="listbox"
						aria-controls="skills-select-options"
						aria-label="Select skills"
						tabIndex={0}
						className="flex h-10 min-w-50 cursor-pointer items-center justify-start gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
						onClick={() => setOpen(!open)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								setOpen(!open);
							}
						}}
					>
						<ListFilter
							className="size-4 shrink-0 text-muted-foreground"
							aria-hidden="true"
						/>

						{selectedIds.length > 0 && (
							<span className="text-muted-foreground">Skills</span>
						)}

						<div className="flex flex-1 items-center gap-1 overflow-hidden">
							{selectedSkills.length > 0 ? (
								<div className="flex flex-wrap gap-1">
									{selectedSkills.slice(0, 3).map((skill) => (
										<span
											key={skill.id}
											className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
										>
											{skill.name}
										</span>
									))}
									{selectedSkills.length > 3 && (
										<span className="text-xs text-muted-foreground">
											+{selectedSkills.length - 3} more
										</span>
									)}
								</div>
							) : (
								<span className="text-muted-foreground">Select skills…</span>
							)}
						</div>

						<span className="z-10 ml-auto flex items-center gap-2">
							{selectedIds.length > 0 && (
								<button
									type="button"
									aria-label="Clear selection"
									className="z-10 rounded-sm opacity-50 hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-none"
									onClick={handleClear}
								>
									<X className="size-4 shrink-0" />
								</button>
							)}
							<ChevronsUpDown
								className="size-4 shrink-0 opacity-50"
								aria-hidden="true"
							/>
						</span>
					</div>
				</PopoverTrigger>

				<PopoverContent
					className="w-[--radix-popover-trigger-width] p-0"
					id="skills-select-options"
				>
					<Command>
						<CommandInput placeholder={placeholder} aria-label="Search skills" />
						<CommandList>
							<CommandEmpty>No skills found.</CommandEmpty>
							<CommandGroup>
								{skills.map((skill) => (
									<CommandItem
										key={skill.id}
										value={skill.name}
										onSelect={() => handleSelect(skill.id)}
										aria-selected={selectedIds.includes(skill.id)}
									>
										<Check
											className={cn(
												'mr-2 size-4',
												selectedIds.includes(skill.id)
													? 'opacity-100'
													: 'opacity-0',
											)}
											aria-hidden="true"
										/>
										{skill.name}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</>
	);
}
