import { openDatabase } from './client';

const connection = openDatabase({
	url: process.env.TURSO_DATABASE_URL!,
	authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = connection.db;
