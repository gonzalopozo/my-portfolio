import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ExperienceOverviewGridItemContent } from '@/components/public/experience-overview-grid-item-content';
import { ExperienceGridItemContent } from '@/components/public/experience-grid-item-content';
import { PortfolioGrid } from '@/components/public/portfolio-grid';
import { PortfolioGridSkeleton } from '@/components/loading/portfolio-grid-skeleton';
import { ProjectGridItemContent } from '@/components/public/project-grid-item-content';
import { getPublicInfoAboutMe } from '@/lib/queries/about-me';
import { SocialLinkGridItemContent } from '@/components/public/social-link-grid-item-content';
import { LinkIcon } from 'lucide-react';
import { DynamicIcon } from '@/components/public/dynamic-icon';
import { getPublicExperiences } from '@/lib/queries/experiences';
import { getPublicSocialLinks } from '@/lib/queries/social-links';
import { getPublicProjects } from '@/lib/queries/projects';
import { getPublicUsedSkills } from '@/lib/queries/skills';
import { getTrack } from '@/lib/queries/last-fm';

export const metadata: Metadata = {
	title: 'Gonzalo Pozo - Full Stack Developer',
	description:
		'Portfolio of Gonzalo Pozo, a full stack developer building Next.js, React, TypeScript, and Tailwind CSS web experiences.',
	alternates: {
		canonical: 'https://gonzalopozo.dev',
	},
};

async function PortfolioContent() {
	const [projects, experiences, socialLinks, aboutMe, track, usedSkills] = await Promise.all([
		getPublicProjects(),
		getPublicExperiences(),
		getPublicSocialLinks(),
		getPublicInfoAboutMe(),
		getTrack(),
		getPublicUsedSkills(),
	]);

	const projectCards = projects.map((project, index) => ({
		id: `project:${project.id}`,
		content: (
			<ProjectGridItemContent
				project={project}
				variant={index === 2 ? 'horizontal' : 'vertical'}
			/>
		),
	}));
	const experienceCards = experiences.map((experience) => ({
		id: `experience:${experience.id}`,
		content: <ExperienceGridItemContent experience={experience} />,
	}));
	const socialLinkCards = socialLinks.map((socialLink) => ({
		id: `social:${socialLink.id}`,
		content: (
			<SocialLinkGridItemContent
				backgroundColor={socialLink.color}
				url={socialLink.url}
				ariaLabel={`Visit ${socialLink.name}`}
			>
				<DynamicIcon
					iconFullName={socialLink.icon}
					className="size-14"
					fallback={<LinkIcon aria-hidden="true" className="size-14" />}
				/>
			</SocialLinkGridItemContent>
		),
	}));

	return (
		<PortfolioGrid
			infoAboutMe={aboutMe}
			projectCards={projectCards}
			experienceCards={experienceCards}
			experienceOverviewCard={<ExperienceOverviewGridItemContent skills={usedSkills} />}
			socialLinkCards={socialLinkCards}
			lastTrack={track}
		/>
	);
}

export default function PublicPage() {
	return (
		<Suspense fallback={<PortfolioGridSkeleton />}>
			<PortfolioContent />
		</Suspense>
	);
}
