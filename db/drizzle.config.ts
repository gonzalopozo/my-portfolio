import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './db/schema/*.ts',
	dialect: 'turso',
	out: './db/migrations',
	casing: 'snake_case',
	dbCredentials: {
		url: process.env.TURSO_DATABASE_URL!,
		authToken: process.env.TURSO_AUTH_TOKEN!,
	},
});
