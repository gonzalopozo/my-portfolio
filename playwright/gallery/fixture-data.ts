import type { ProjectInfo, Skill, Track } from '@/lib/types';

export const longSkillName = 'Distributed application architecture and release engineering';

export const project: ProjectInfo = {
	id: 1,
	title: 'A project for exploring the layout of long titles at several container widths',
	description: 'An archive of experiments with responsive documents, layouts, and interfaces.',
	status: 'active',
	url: 'https://projects.example.test/gallery',
	repoUrl: 'https://projects.example.test/repository',
	ogImageUrl: null,
	order: 1,
	createdAt: new Date('2024-01-01T00:00:00Z'),
	updatedAt: new Date('2024-02-01T00:00:00Z'),
	projectSkills: ['TypeScript', 'React', 'Node.js', longSkillName].map((name, index) => ({
		skill: { id: index + 1, name, icon: null, customIconUrl: null },
	})),
};

export const narrowSkills: Skill[] = ['React', 'TypeScript', longSkillName].map((name, index) => ({
	id: index + 1,
	name,
	icon: null,
	customIconUrl: null,
}));

export const track = {
	isOnline: true,
	trackName: 'An exceptionally long track title with multiple words to wrap and truncate',
	artistName: 'Gallery artist',
	albumName: null,
	artworkUrl: '/hobbies/basketball_dark.png',
	lastFmUrl: null,
	spotifyTrackId: null,
	spotifyUrl: 'https://open.spotify.com/track/example',
	spotifyArtworkUrl: null,
	playedAtUnix: null,
	playedAtLabel: null,
} satisfies Track;
