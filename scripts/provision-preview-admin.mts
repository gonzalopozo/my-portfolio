import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { openDatabase } from '../db/client';
import { accounts, users } from '../db/schema/better-auth';

class PreviewSetupError extends Error {}

function required(name: string) {
	const value = process.env[name];
	if (!value) throw new PreviewSetupError(`Set ${name} in your Preview environment file.`);
	return value;
}

/** Create credentials locally; administrator access still requires an explicit allowlist. */
async function main() {
	if (process.env.APP_ENV !== 'preview' || process.env.VERCEL || process.env.GITHUB_ACTIONS)
		throw new PreviewSetupError('Run this setup locally with APP_ENV=preview.');
	if (!stdin.isTTY || !stdout.isTTY)
		throw new PreviewSetupError('Run this setup in an interactive terminal.');

	const url = required('TURSO_DATABASE_URL');
	const authToken = required('TURSO_AUTH_TOKEN');
	let target: URL;
	try {
		target = new URL(url);
	} catch {
		throw new PreviewSetupError('TURSO_DATABASE_URL must be a Preview Turso URL.');
	}
	if (
		target.protocol !== 'libsql:' ||
		!/^[a-z0-9.-]+\.turso\.io$/.test(target.hostname) ||
		target.username ||
		target.password ||
		target.port ||
		!['', '/'].includes(target.pathname) ||
		target.search ||
		target.hash
	)
		throw new PreviewSetupError('Use the exact libsql:// hostname of your Preview database.');

	const email = required('PREVIEW_ADMIN_EMAIL').trim().toLowerCase();
	if (!/^[a-z0-9._+-]+@example\.test$/.test(email))
		throw new PreviewSetupError('Use a synthetic email such as preview-admin@example.test.');
	const password = required('PREVIEW_ADMIN_PASSWORD');
	if (password.length < 12 || password.length > 128)
		throw new PreviewSetupError('Choose a separate Preview password of 12–128 characters.');

	console.info(`Selected database: ${target.hostname}`);
	const terminal = createInterface({ input: stdin, output: stdout });
	try {
		const confirmation = await terminal.question(
			'Type the full hostname of your isolated Preview database to continue: ',
		);
		if (confirmation.trim() !== target.hostname)
			throw new PreviewSetupError('Database confirmation did not match. Setup cancelled.');
	} finally {
		terminal.close();
	}

	const { client, db } = openDatabase({ url, authToken });
	try {
		const id = await db.transaction(async (transaction) => {
			const [existing] = await transaction
				.select({ id: users.id })
				.from(users)
				.where(eq(users.email, email));
			if (existing) {
				const [account] = await transaction
					.select({ password: accounts.password })
					.from(accounts)
					.where(
						and(
							eq(accounts.userId, existing.id),
							eq(accounts.providerId, 'credential'),
						),
					);
				if (
					!account?.password ||
					!(await verifyPassword({ hash: account.password, password }))
				)
					throw new PreviewSetupError(
						'This test account already exists with different credentials. Use its original password or a new synthetic email.',
					);
				return existing.id;
			}

			const userId = randomUUID();
			await transaction.insert(users).values({ id: userId, name: 'Preview Admin', email });
			await transaction.insert(accounts).values({
				id: randomUUID(),
				accountId: userId,
				providerId: 'credential',
				userId,
				password: await hashPassword(password),
			});
			return userId;
		});
		console.info('Preview credentials are ready. Set this in Vercel Preview:');
		console.info(`ADMIN_USER_IDS=${id}`);
	} finally {
		client.close();
	}
}

await main().catch((error: unknown) => {
	console.error(
		error instanceof PreviewSetupError
			? error.message
			: 'Preview account setup failed. Confirm the Preview credentials and apply the committed migrations first. Private database errors are not printed.',
	);
	process.exitCode = 1;
});
