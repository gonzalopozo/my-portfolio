import { safeWebUrl } from '@/lib/security/urls';
import { GridItemShowMoreButton } from '@/components/public/grid-item-show-more-button';
import { SkillsPills } from '@/components/public/skills-pills';
import type { ExperienceData } from '@/lib/types';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	month: 'short',
	year: 'numeric',
	timeZone: 'UTC',
});

export function ExperienceGridItemContent({ experience }: { experience: ExperienceData }) {
	const dates = experience.startDate
		? `${dateFormatter.format(experience.startDate)} – ${experience.endDate ? dateFormatter.format(experience.endDate) : 'Present'}`
		: experience.endDate
			? dateFormatter.format(experience.endDate)
			: null;

	return (
		<div className="group/experience flex min-h-0 flex-col gap-4 p-5 md:size-full md:gap-3 md:overflow-hidden md:px-6">
			<div
				className="flex min-h-0 flex-1 flex-col gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-ring md:overflow-y-auto md:overscroll-contain"
				tabIndex={0}
				role="region"
				aria-label={`${experience.role} at ${experience.company}`}
			>
				<h3 className="text-xl/tight font-bold tracking-tight text-balance wrap-break-word md:text-2xl/tight">
					{experience.role}
				</h3>
				<p className="text-sm font-semibold wrap-break-word">
					{safeWebUrl(experience.companyUrl) ? (
						<a
							href={safeWebUrl(experience.companyUrl)}
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
						>
							{experience.company}
						</a>
					) : (
						experience.company
					)}
				</p>
				{dates || experience.location ? (
					<p className="text-xs text-muted-foreground">
						{[dates, experience.location].filter(Boolean).join(' · ')}
					</p>
				) : null}
				<p className="text-sm/relaxed wrap-break-word whitespace-pre-line text-muted-foreground">
					{experience.description}
				</p>
			</div>
			<SkillsPills skills={experience.experienceSkills.map(({ skill }) => skill)} limit={5} />
			<GridItemShowMoreButton
				variant="experience"
				label="View experience"
				className="min-h-11 w-fit shrink-0 rounded-full px-4 md:h-9 md:min-h-0"
			/>
		</div>
	);
}
