import { createClient, type Config } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/** Each test owns a client and closes it; production owns one client per process. */
export function openDatabase(config: Config) {
	let client: ReturnType<typeof createClient>;
	try {
		client = createClient(config);
	} catch {
		throw new Error('Database configuration is invalid.');
	}
	const db = drizzle(client, { schema, casing: 'snake_case' });
	return { client, db };
}
