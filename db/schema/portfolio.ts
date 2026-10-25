import { relations, sql } from 'drizzle-orm';
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const timestamps = {
	createdAt: integer({ mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer({ mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
};

export const projects = sqliteTable('projects', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	title: text().notNull(),
	description: text().notNull(),
	url: text(),
	repoUrl: text(),
	ogImageUrl: text(),
	status: text({ enum: ['active', 'archived', 'in-progress'] })
		.notNull()
		.default('in-progress'),
	order: integer().notNull().default(0),
	...timestamps,
});

export const experiences = sqliteTable('experiences', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	role: text().notNull(),
	company: text().notNull(),
	companyUrl: text(),
	companyLogo: text(),
	description: text().notNull(),
	startDate: integer({ mode: 'timestamp_ms' }),
	endDate: integer({ mode: 'timestamp_ms' }),
	order: integer().notNull().default(0),
	location: text(),
	...timestamps,
});

export const skills = sqliteTable('skills', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	type: text({
		enum: [
			'fullstack',
			'frontend',
			'backend',
			'database',
			'devops',
			'practices',
			'tools',
			'other',
		],
	})
		.notNull()
		.default('other'),
	icon: text(),
	customIconUrl: text('custom_icon_url'),
	url: text(),
	useColor: integer('use_color', { mode: 'boolean' }).notNull().default(false),
	customColor: text('custom_color'),
	...timestamps,
});

export const projectSkills = sqliteTable(
	'project_skills',
	{
		projectId: integer()
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		skillId: integer()
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		...timestamps,
	},
	(table) => [primaryKey({ columns: [table.projectId, table.skillId] })],
);

export const experienceSkills = sqliteTable(
	'experience_skills',
	{
		experienceId: integer()
			.notNull()
			.references(() => experiences.id, { onDelete: 'cascade' }),
		skillId: integer()
			.notNull()
			.references(() => skills.id, { onDelete: 'cascade' }),
		...timestamps,
	},
	(table) => [primaryKey({ columns: [table.experienceId, table.skillId] })],
);

export const siteSettings = sqliteTable('site_settings', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	isEmployed: integer({ mode: 'boolean' }),
	resumeUrl: text().notNull(),
	statusMessage: text(),
	updatedAt: integer({ mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
});

export const employmentHistory = sqliteTable('employment_history', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	isEmployed: integer({ mode: 'boolean' }),
	changedAt: integer({ mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
});

export const socialLinks = sqliteTable('social_links', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	name: text().notNull(),
	url: text().notNull(),
	icon: text(),
	color: text('background_color').notNull().default('#66696D'),
	order: integer().notNull().default(0),
	...timestamps,
});

// Projects: has many projectSkills
export const projectsRelations = relations(projects, ({ many }) => ({
	projectSkills: many(projectSkills),
}));

// Experiences: has many experienceSkills
export const experiencesRelations = relations(experiences, ({ many }) => ({
	experienceSkills: many(experienceSkills),
}));

// Skills: connected to BOTH junction tables
export const skillsRelations = relations(skills, ({ many }) => ({
	projectSkills: many(projectSkills),
	experienceSkills: many(experienceSkills),
}));

// ProjectSkills junction: belongs to one project AND one skill
export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
	project: one(projects, {
		fields: [projectSkills.projectId],
		references: [projects.id],
	}),
	skill: one(skills, {
		fields: [projectSkills.skillId],
		references: [skills.id],
	}),
}));

// ExperienceSkills junction: belongs to one experience AND one skill
export const experienceSkillsRelations = relations(experienceSkills, ({ one }) => ({
	experience: one(experiences, {
		fields: [experienceSkills.experienceId],
		references: [experiences.id],
	}),
	skill: one(skills, {
		fields: [experienceSkills.skillId],
		references: [skills.id],
	}),
}));
