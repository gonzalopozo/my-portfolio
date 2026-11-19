// cspell:ignore Nextdotjs
import type { CSSProperties, ReactNode } from 'react';
import { ColorPickerStory, SkillsMultiSelectStory, SortableTableStory } from './admin-stories';
import { narrowSkills, project, track } from './fixture-data';
import { LocationMapStory, MapCardStory } from './map-stories';
import { AdminHeader } from '@/components/admin/header';
import { IconPicker } from '@/components/admin/icon-picker';
import { BB8ThemeSwitcher } from '@/components/public/bb8-theme-switcher';
import { DynamicIcon } from '@/components/public/dynamic-icon';
import { ExperienceOverviewGridItemContent } from '@/components/public/experience-overview-grid-item-content';
import { GridItem } from '@/components/public/grid-item';
import { HobbiesGridItemClient } from '@/components/public/hobbies-grid-item-client';
import { InfoGridItemContent } from '@/components/public/info-grid-item-content';
import { LastTrackGridItemContent } from '@/components/public/last-track-grid-item-content';
import { MapGridItem } from '@/components/public/map-grid-item';
import { PortfolioGrid } from '@/components/public/portfolio-grid';
import { PortfolioSectionProvider } from '@/components/public/portfolio-section-provider';
import { ProjectGridItemContent } from '@/components/public/project-grid-item-content';
import { SkillsPills } from '@/components/public/skills-pills';
import { SocialLinkGridItemContent } from '@/components/public/social-link-grid-item-content';

function cardSize(width: number, height?: number): CSSProperties {
	return { width, height, maxWidth: 'calc(100% - 32px)', margin: 16 };
}

const experienceSkills = [
	['React', 'SiReact'],
	['TypeScript', 'SiTypescript'],
	['Next.js', 'SiNextdotjs'],
	['Tailwind CSS', 'SiTailwindcss'],
	['PostgreSQL', 'SiPostgresql'],
	['Docker', 'SiDocker'],
].map(([name, icon], index) => ({
	id: index + 1,
	name,
	icon: `${icon} | si`,
	customIconUrl: null,
	url: `https://skills.example.test/${index + 1}`,
	useColor: false,
	customColor: null,
	usageCount: 1,
}));

const hobbies = [
	{ id: 'nba', name: 'NBA', art: 'basketball', icon: 'BiSolidBasketball | bi' },
	{ id: 'cars', name: 'Cars', art: 'cars', icon: 'BiSolidCar | bi' },
].map(({ id, name, art, icon }) => ({
	id,
	name,
	icon: <DynamicIcon iconFullName={icon} className="size-6" />,
	lightThemeImage: `/hobbies/${art}_dark.png`,
	darkThemeImage: `/hobbies/${art}_light.png`,
}));

function ProjectStory({ variant }: { variant: 'horizontal' | 'vertical' }) {
	return (
		<PortfolioSectionProvider>
			<GridItem
				variant="project"
				style={{ width: 'calc(100vw - 500px)', height: 580, margin: 16 }}
			>
				<ProjectGridItemContent project={project} variant={variant} />
			</GridItem>
		</PortfolioSectionProvider>
	);
}

function GridProject({ label }: { label: string }) {
	return (
		<div style={{ padding: 24 }}>
			<p>{label}</p>
			<button type="button" style={{ padding: 8 }}>
				Embedded {label} control
			</button>
		</div>
	);
}

function MusicStory({ desktop }: { desktop: boolean }) {
	return (
		<GridItem
			variant="about"
			cardClassName="group/music @container/music-card @container-[size] isolate"
			style={cardSize(desktop ? 265 : 210, desktop ? 265 : 210)}
		>
			<LastTrackGridItemContent track={track} isDesktop={desktop} />
		</GridItem>
	);
}

export const stories: Record<string, ReactNode> = {
	'bb8-theme-switcher': (
		<GridItem variant="about" style={cardSize(280, 270)}>
			<BB8ThemeSwitcher />
		</GridItem>
	),
	'portfolio-grid': (
		<PortfolioGrid
			infoAboutMe={undefined}
			projectCards={[
				{ id: 'project-one', content: <GridProject label="Project one" /> },
				{ id: 'project-two', content: <GridProject label="Project two" /> },
				{ id: 'project-three', content: <GridProject label="Project three" /> },
			]}
			experienceCards={[]}
			experienceOverviewCard={null}
			socialLinkCards={[]}
			lastTrack={null}
			mapCard={null}
			hobbiesCard={null}
		/>
	),
	'project-horizontal': <ProjectStory variant="horizontal" />,
	'project-vertical': <ProjectStory variant="vertical" />,
	'info-card': (
		<PortfolioSectionProvider>
			<GridItem variant="about" style={cardSize(510, 250)}>
				<InfoGridItemContent
					infoAboutMe={{
						isEmployed: true,
						resumeUrl: 'https://portfolio.example.test/cv',
						statusMessage:
							'I am working on a release with a team that reviews designs, documents decisions and builds accessible workflows. '.repeat(
								6,
							),
					}}
				/>
			</GridItem>
		</PortfolioSectionProvider>
	),
	'experience-overview': (
		<PortfolioSectionProvider>
			<GridItem variant="experience" style={cardSize(260, 260)}>
				<ExperienceOverviewGridItemContent skills={experienceSkills} />
			</GridItem>
		</PortfolioSectionProvider>
	),
	'social-link': (
		<GridItem variant="about" style={cardSize(210, 185)}>
			<SocialLinkGridItemContent
				backgroundColor="#0d9488"
				url="https://portfolio.example.test/social"
				ariaLabel="Open gallery social profile"
			>
				<span aria-hidden="true">Social profile</span>
			</SocialLinkGridItemContent>
		</GridItem>
	),
	'music-mobile': <MusicStory desktop={false} />,
	'music-desktop': <MusicStory desktop />,
	hobbies: (
		<PortfolioSectionProvider>
			<GridItem
				variant="about"
				cardClassName="group/hobby @container/hobby-card isolate md:@container-[size]"
				style={cardSize(570, 320)}
			>
				<HobbiesGridItemClient hobbies={hobbies} />
			</GridItem>
		</PortfolioSectionProvider>
	),
	'map-card': (
		<GridItem variant="about" cardClassName="group/map" style={cardSize(360, 340)}>
			<MapCardStory>
				<MapGridItem />
			</MapCardStory>
		</GridItem>
	),
	'location-map': <LocationMapStory />,
	'skills-pills': (
		<GridItem variant="about" style={cardSize(210)} sizing="natural">
			<div style={{ padding: 16 }}>
				<SkillsPills skills={narrowSkills} />
			</div>
		</GridItem>
	),
	'color-picker': <ColorPickerStory />,
	'color-picker-edge': <ColorPickerStory atEdge />,
	'sortable-table': <SortableTableStory />,
	'icon-picker': (
		<div style={{ width: 320, margin: 24 }}>
			<IconPicker />
		</div>
	),
	'admin-header': <AdminHeader />,
	'skills-multi-select': <SkillsMultiSelectStory />,
};
