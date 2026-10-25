import { safeWebUrl } from '@/lib/security/urls';
import Image from 'next/image';
import { ArrowUpRight, Github, type LucideIcon } from 'lucide-react';
import { GridItemShowMoreButton } from '@/components/public/grid-item-show-more-button';
import { SkillsPills } from '@/components/public/skills-pills';
import { StatusIndicator } from '@/components/public/status-indicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProjectInfo, ProjectStatus } from '@/lib/types';

type ProjectGridItemContentVariant = 'vertical' | 'horizontal';

interface ProjectGridItemContentProps {
	project: ProjectInfo;
	variant?: ProjectGridItemContentVariant;
}

interface ProjectMediaProps {
	project: ProjectInfo;
	className?: string;
	sizes: string;
}

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
	active: 'Activo',
	archived: 'Archivado',
	'in-progress': 'En progreso',
};

const PROJECT_STATUS_BADGE_VARIANTS: Record<ProjectStatus, 'default' | 'secondary' | 'outline'> = {
	active: 'default',
	archived: 'outline',
	'in-progress': 'secondary',
};

const PROJECT_DATE_FORMATTERS: Record<'summary' | 'full', Intl.DateTimeFormat> = {
	summary: new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }),
	full: new Intl.DateTimeFormat('es-ES', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}),
};

function formatProjectDate(date: Date, format: 'summary' | 'full' = 'summary') {
	return PROJECT_DATE_FORMATTERS[format].format(new Date(date));
}

function ProjectMedia({ project, className, sizes }: ProjectMediaProps) {
	return (
		<figure className={className}>
			{project.ogImageUrl ? (
				<Image
					src={project.ogImageUrl}
					alt={project.title}
					width={1260}
					height={630}
					className="size-full object-cover transition-transform duration-500 ease-out group-hover/project:scale-[1.03]"
					sizes={sizes}
				/>
			) : (
				<div
					className="relative flex size-full flex-col justify-end bg-secondary p-6"
					aria-hidden="true"
				>
					<div className="absolute inset-0 overflow-hidden">
						<div className="absolute inset-0 animate-shimmer bg-linear-to-r from-transparent via-white/10 to-transparent" />
					</div>
					<p className="relative max-w-[12ch] text-2xl font-semibold tracking-tight">
						{project.title}
					</p>
				</div>
			)}
		</figure>
	);
}

interface ProjectActionButtonProps {
	href: string | null;
	icon: LucideIcon;
	label: string;
}

const projectLinkButtonClassName =
	'h-full min-h-11 w-full rounded-2xl border border-border/60 bg-secondary/35 px-0 text-muted-foreground shadow-none hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]';

const projectShowMoreButtonClassName = 'min-h-11 w-full justify-center rounded-full';

function ProjectActionButton({ href, icon: Icon, label }: ProjectActionButtonProps) {
	const safeHref = safeWebUrl(href);
	if (!safeHref) return null;

	return (
		<Button asChild variant="ghost" size="icon" className={projectLinkButtonClassName}>
			<a href={safeHref} target="_blank" rel="noopener noreferrer" aria-label={label}>
				<Icon data-icon="inline-start" aria-hidden="true" />
				<span className="sr-only">{label}</span>
			</a>
		</Button>
	);
}

interface ProjectGridItemContentVariantProps {
	project: ProjectInfo;
	skills: ProjectInfo['projectSkills'][number]['skill'][];
	actionCount: number;
}

function ProjectGridItemVerticalContent({
	project,
	skills,
	actionCount,
}: ProjectGridItemContentVariantProps) {
	return (
		<div className="group/project grid min-h-0 grid-rows-[auto_auto_auto] gap-4 md:h-full md:grid-rows-[auto_minmax(0,1fr)_auto] md:gap-6 md:[@container_project-card_(max-width:360px)]:gap-3.5">
			<CardHeader className="gap-0 pb-0">
				<ProjectMedia
					project={project}
					sizes="(max-width: 767px) 100vw, (max-width: 1200px) 38vw, 520px"
					className="relative -mx-6 aspect-video min-h-36 overflow-hidden border-b border-border/60 bg-secondary/40 [@container_project-card_(max-height:340px)]:min-h-22 [@container_project-card_(max-height:440px)_and_(min-height:341px)]:min-h-28"
				/>
			</CardHeader>

			<CardContent className="flex min-h-0 flex-col px-5 md:overflow-hidden md:px-7 md:[@container_project-card_(max-width:360px)]:px-3.5">
				<div className="flex min-h-0 flex-1 flex-col justify-between gap-3 md:overflow-hidden md:[@container_project-card_(min-width:361px)_and_(max-width:767px)]:gap-2">
					<div className="flex shrink-0 flex-col gap-1.5">
						<div className="flex items-start gap-2">
							<Badge
								variant={PROJECT_STATUS_BADGE_VARIANTS[project.status]}
								className="gap-2"
							>
								<StatusIndicator status={project.status} className="shrink-0" />
								{PROJECT_STATUS_LABELS[project.status]}
							</Badge>
						</div>

						<CardTitle className="text-lg/tight tracking-tight text-balance wrap-break-word sm:text-xl [@container_project-card_(max-width:360px)]:text-[1.0625rem]">
							<h3>{project.title}</h3>
						</CardTitle>

						<CardDescription className="shrink-0 text-sm/relaxed wrap-break-word md:line-clamp-5 md:h-[5lh] md:[@container_project-card_(max-height:340px)]:line-clamp-2 md:[@container_project-card_(max-height:340px)]:h-[2lh] md:[@container_project-card_(max-height:440px)_and_(min-height:341px)]:line-clamp-3 md:[@container_project-card_(max-height:440px)_and_(min-height:341px)]:h-[3lh] md:[@container_project-card_(min-width:361px)_and_(max-width:767px)]:line-clamp-2 md:[@container_project-card_(min-width:361px)_and_(max-width:767px)]:h-[2lh]">
							{project.description}
						</CardDescription>
					</div>

					{skills.length ? (
						<SkillsPills
							skills={skills}
							limit={6}
							className="shrink-0 gap-3 [@container_project-card_(max-width:360px)]:gap-1.5"
						/>
					) : null}

					<p className="shrink-0 text-xs text-muted-foreground">
						Actualizado en:{' '}
						<span className="font-medium text-foreground">
							{formatProjectDate(project.updatedAt, 'full')}
						</span>
					</p>
				</div>
			</CardContent>

			<CardFooter className="px-5 pb-5 md:px-7 md:[@container_project-card_(max-width:360px)]:px-3.5 md:[@container_project-card_(max-width:360px)]:pb-4">
				<div className="flex w-full flex-col gap-2">
					{actionCount ? (
						<div
							className={cn('grid gap-2', {
								'grid-cols-1': actionCount === 1,
								'grid-cols-2': actionCount === 2,
							})}
						>
							<ProjectActionButton
								href={project.repoUrl}
								icon={Github}
								label="Ver repositorio"
							/>
							<ProjectActionButton
								href={project.url}
								icon={ArrowUpRight}
								label="Abrir proyecto"
							/>
						</div>
					) : null}

					<GridItemShowMoreButton
						variant="project"
						label="View more"
						className={projectShowMoreButtonClassName}
					/>
				</div>
			</CardFooter>
		</div>
	);
}

function ProjectGridItemHorizontalContent({ project, skills }: ProjectGridItemContentVariantProps) {
	return (
		<div className="group/project grid min-h-0 grid-cols-1 gap-4 md:h-full md:grid-cols-[minmax(12rem,0.78fr)_minmax(0,1.22fr)] md:gap-0 md:[@container_project-card_(max-width:480px)]:grid-cols-1 md:[@container_project-card_(max-width:480px)]:grid-rows-[minmax(6rem,0.75fr)_minmax(0,1fr)]">
			<ProjectMedia
				project={project}
				sizes="(max-width: 767px) 100vw, (max-width: 1200px) 22vw, 260px"
				className="relative aspect-video min-h-0 overflow-hidden border-b border-border/60 bg-secondary/40 md:aspect-auto md:border-r md:border-b-0 md:[@container_project-card_(max-width:480px)]:border-r-0 md:[@container_project-card_(max-width:480px)]:border-b"
			/>

			<CardContent className="grid min-h-0 grid-cols-1 gap-3 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_3.5rem] md:overflow-hidden md:py-4 md:pr-4 md:pl-6 md:[@container_project-card_(max-width:480px)]:grid-cols-1 md:[@container_project-card_(max-width:480px)]:grid-rows-[minmax(0,1fr)_auto] md:[@container_project-card_(max-width:480px)]:gap-2.5 md:[@container_project-card_(max-width:480px)]:py-3.5 md:[@container_project-card_(max-width:480px)]:pr-3.5">
				<div className="flex min-h-0 flex-col gap-2 md:overflow-hidden">
					<Badge
						variant={PROJECT_STATUS_BADGE_VARIANTS[project.status]}
						className="w-fit shrink-0 gap-2"
					>
						<StatusIndicator status={project.status} className="shrink-0" />
						{PROJECT_STATUS_LABELS[project.status]}
					</Badge>

					<CardTitle className="shrink-0 text-lg/tight tracking-tight text-balance wrap-break-word md:line-clamp-2 md:text-base/tight md:[@container_project-card_(max-width:360px)]:text-[0.9375rem]">
						<h3>{project.title}</h3>
					</CardTitle>

					<CardDescription className="flex-1 text-sm/relaxed wrap-break-word md:text-xs/relaxed">
						{project.description}
					</CardDescription>

					{skills.length ? (
						<SkillsPills
							skills={skills}
							limit={4}
							className="shrink-0 gap-1.5 md:overflow-hidden md:[@container_project-card_(max-width:360px)]:hidden"
						/>
					) : null}

					<p className="mt-auto shrink-0 truncate text-xs text-muted-foreground">
						Actualizado en:{' '}
						<span className="font-medium text-foreground">
							{formatProjectDate(project.updatedAt, 'full')}
						</span>
					</p>
				</div>

				<CardFooter className="grid min-h-0 w-full auto-cols-fr grid-flow-col gap-2 p-0 md:grid-flow-row md:auto-rows-fr md:grid-cols-1 md:gap-1.5 md:[@container_project-card_(max-width:480px)]:auto-cols-fr md:[@container_project-card_(max-width:480px)]:grid-flow-col md:[@container_project-card_(max-width:480px)]:grid-rows-1">
					<ProjectActionButton
						href={project.repoUrl}
						icon={Github}
						label="Ver repositorio"
					/>
					<ProjectActionButton
						href={project.url}
						icon={ArrowUpRight}
						label="Abrir proyecto"
					/>

					<GridItemShowMoreButton
						variant="project"
						buttonSize="icon"
						icon="arrow-right"
						iconOnly
						label="View more"
						className={cn(projectShowMoreButtonClassName, 'h-full rounded-2xl')}
					/>
				</CardFooter>
			</CardContent>
		</div>
	);
}

export function ProjectGridItemContent({
	project,
	variant = 'vertical',
}: ProjectGridItemContentProps) {
	const skills = project.projectSkills.map(({ skill }) => skill);
	const actionCount =
		Number(Boolean(safeWebUrl(project.repoUrl))) + Number(Boolean(safeWebUrl(project.url)));

	if (variant === 'horizontal') {
		return (
			<ProjectGridItemHorizontalContent
				project={project}
				skills={skills}
				actionCount={actionCount}
			/>
		);
	}

	return (
		<ProjectGridItemVerticalContent
			project={project}
			skills={skills}
			actionCount={actionCount}
		/>
	);
}
