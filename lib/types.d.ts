export type SkillType =
	| 'fullstack'
	| 'frontend'
	| 'backend'
	| 'database'
	| 'devops'
	| 'practices'
	| 'tools'
	| 'other';

export type ProjectStatus = 'active' | 'archived' | 'in-progress';

export interface Skill {
	id: number;
	name: string;
	icon: string | null;
	customIconUrl: string | null;
}
export interface ProjectInfo {
	id: number;
	title: string;
	description: string;
	url: string | null;
	repoUrl: string | null;
	ogImageUrl: string | null;
	status: ProjectStatus;
	order: number;
	createdAt: Date;
	updatedAt: Date;
	projectSkills: { skill: Skill }[];
}

export interface SocialLinkInfo {
	id: number;
	name: string;
	url: string;
	icon: string | null;
	color: string;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ExperienceData {
	id: number;
	description: string;
	order: number;
	createdAt: Date;
	updatedAt: Date;
	role: string;
	company: string;
	companyUrl: string | null;
	companyLogo: string | null;
	startDate: Date | null;
	endDate: Date | null;
	location: string | null;
	experienceSkills: { skill: Skill }[];
}

export interface Settings {
	id: number;
	isEmployed: boolean | null;
	resumeUrl: string;
	statusMessage: string | null;
	updatedAt: Date;
}

export interface Track {
	isOnline: boolean;
	trackName: string;
	artistName: string | null;
	albumName: string | null;
	artworkUrl: string | null;
	lastFmUrl: string | null;
	spotifyTrackId: string | null;
	spotifyUrl: string | null;
	spotifyArtworkUrl: string | null;
	playedAtUnix: number | null;
	playedAtLabel: string | null;
}
