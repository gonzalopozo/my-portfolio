import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Recovery records deliberately outlive their projects and immutable candidate URLs. */
export const projectImageOperations = sqliteTable(
	'project_image_operations',
	{
		id: text().primaryKey(),
		projectId: integer().notNull(),
		storeOrigin: text().notNull(),
		candidateUrl: text(),
		previousImage: text(),
		state: text({ enum: ['pending', 'applied', 'abandoned', 'complete'] }).notNull(),
		createdAt: integer().notNull(),
		updatedAt: integer().notNull(),
		appliedAt: integer(),
		leaseToken: text(),
		leaseUntil: integer().notNull().default(0),
		retryCount: integer().notNull().default(0),
		lastFailure: text(),
	},
	(table) => [
		index('project_image_operations_due').on(table.state, table.leaseUntil, table.createdAt),
	],
);
