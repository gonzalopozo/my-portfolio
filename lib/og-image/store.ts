import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { projects } from '@/db/schema/portfolio';
import { projectImageOperations as operations } from '@/db/schema/project-image-operations';
import { getBlobPublicHostname } from '@/lib/blob-environment';
import { del } from '@/lib/blob';
import { isProjectImageUrl } from '@/lib/security/blob-ownership';
import { reportOgImageError } from '@/lib/og-image-errors';
import { logOperation } from '@/lib/observability/logger';
import type { OgImageResult, ProjectImageActionResult } from '@/lib/og-image-feedback';
import { ImageBudget, OgImageOperationError } from './budget';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ImageOperation = typeof operations.$inferSelect;
const DAY = 24 * 60 * 60 * 1000;

function storeOrigin(): string {
	const configured = getBlobPublicHostname();
	try {
		const origin = new URL(configured ?? '').origin;
		if (isProjectImageUrl(`${origin}/og-images/1-1.png`, 1, configured)) return origin;
	} catch {
		// Reject malformed configuration without exposing its value.
	}
	throw new OgImageOperationError('upload-failed');
}

export async function prepareImageUpload(
	projectId: number,
	extension: string,
	previousImage: string | null,
	budget: ImageBudget,
) {
	const id = randomUUID();
	const origin = storeOrigin();
	const pathname = `og-images/${projectId}-${Date.now()}-${id.replaceAll('-', '')}.${extension}`;
	const candidateUrl = `${origin}/${pathname}`;
	if (!isProjectImageUrl(candidateUrl, projectId, origin)) {
		throw new OgImageOperationError('upload-failed');
	}
	await budget.run(3000, () =>
		db.insert(operations).values({
			id,
			projectId,
			storeOrigin: origin,
			candidateUrl,
			previousImage,
			state: 'pending',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}),
	);
	return { id, pathname, candidateUrl };
}

/** Storage misconfiguration must not roll back a successful project deletion. */
function cleanupOrigin(previousImage: string): string {
	try {
		return new URL(previousImage).origin;
	} catch {
		// Invalid historical URLs are recorded for diagnosis and never deleted.
		return '';
	}
}

/** The cleanup intent commits in the same transaction as the reference removal. */
export async function recordImageCleanup(
	tx: Transaction,
	projectId: number,
	previousImage: string,
) {
	const id = randomUUID();
	await tx.insert(operations).values({
		id,
		projectId,
		storeOrigin: cleanupOrigin(previousImage),
		previousImage,
		state: 'applied',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	});
	return id;
}

/** Pending-state fencing and the project CAS must commit together. */
export async function persistProjectImage(
	operationId: string,
	source: string,
	budget: ImageBudget,
): Promise<ProjectImageActionResult> {
	try {
		const applied = await budget.run(3000, () =>
			db.transaction(async (tx) => {
				const [operation] = await tx
					.update(operations)
					.set({ updatedAt: Date.now() })
					.where(and(eq(operations.id, operationId), eq(operations.state, 'pending')))
					.returning();
				if (!operation?.candidateUrl) return false;
				const saved = await tx
					.update(projects)
					.set({ ogImageUrl: operation.candidateUrl })
					.where(
						and(
							eq(projects.id, operation.projectId),
							eq(projects.url, source),
							operation.previousImage === null
								? isNull(projects.ogImageUrl)
								: eq(projects.ogImageUrl, operation.previousImage),
						),
					)
					.returning({ id: projects.id });
				await tx
					.update(operations)
					.set({
						state: saved.length ? 'applied' : 'abandoned',
						appliedAt: saved.length ? Date.now() : null,
						updatedAt: Date.now(),
					})
					.where(eq(operations.id, operationId));
				return saved.length > 0;
			}),
		);
		if (!applied) {
			return {
				ok: false,
				error: reportOgImageError(
					'persist-failed',
					'persistence',
					undefined,
					undefined,
					operationId,
				),
			};
		}
	} catch {
		// A committed transaction can lose its response. Rejection never implies rollback.
		try {
			const [operation] = await budget.run(3000, () =>
				db
					.select({ appliedAt: operations.appliedAt })
					.from(operations)
					.where(eq(operations.id, operationId)),
			);
			if (!operation?.appliedAt) throw new OgImageOperationError('persistence-uncertain');
		} catch {
			return {
				ok: false,
				error: reportOgImageError(
					'persistence-uncertain',
					'persistence',
					undefined,
					undefined,
					operationId,
				),
			};
		}
	}
	const cleanup = await cleanupImageOperation(operationId, budget);
	return cleanup.ok ? { ok: true } : { ok: true, warning: cleanup.error };
}

async function deleteUnreferenced(url: string, operation: ImageOperation, budget: ImageBudget) {
	if (
		operation.storeOrigin !== storeOrigin() ||
		!isProjectImageUrl(url, operation.projectId, operation.storeOrigin)
	) {
		throw new OgImageOperationError('delete-failed');
	}
	const [referenced] = await budget.run(3000, () =>
		db.select({ id: projects.id }).from(projects).where(eq(projects.ogImageUrl, url)).limit(1),
	);
	if (referenced) return;
	await budget.run(2000, (abortSignal) => del(url, { abortSignal }));
}

/** A lease prevents duplicate workers; immutable URLs prevent reference resurrection. */
export async function cleanupImageOperation(
	id: string,
	parentBudget = new ImageBudget(2000),
): Promise<OgImageResult> {
	const token = randomUUID();
	try {
		const budget = new ImageBudget(parentBudget.remaining(2000));
		const [operation] = await budget.run(3000, () =>
			db
				.update(operations)
				.set({
					leaseToken: token,
					leaseUntil: Date.now() + 60_000,
					retryCount: sql`${operations.retryCount} + 1`,
				})
				.where(
					and(
						eq(operations.id, id),
						or(eq(operations.state, 'applied'), eq(operations.state, 'abandoned')),
						lt(operations.leaseUntil, Date.now()),
					),
				)
				.returning(),
		);
		if (!operation) return { ok: true };
		if (operation.previousImage && operation.state === 'applied') {
			await deleteUnreferenced(operation.previousImage, operation, budget);
		}
		if (operation.candidateUrl && operation.state === 'abandoned') {
			await deleteUnreferenced(operation.candidateUrl, operation, budget);
		}
		await budget.run(3000, () =>
			db
				.update(operations)
				.set({
					state: 'complete',
					leaseUntil: 0,
					leaseToken: null,
					lastFailure: null,
					updatedAt: Date.now(),
				})
				.where(and(eq(operations.id, id), eq(operations.leaseToken, token))),
		);
		return { ok: true };
	} catch {
		// Record the retry if time remains; otherwise the lease expires automatically.
		try {
			await parentBudget.run(1000, () =>
				db
					.update(operations)
					.set({
						leaseUntil: 0,
						leaseToken: null,
						lastFailure: 'delete-failed',
						updatedAt: Date.now(),
					})
					.where(and(eq(operations.id, id), eq(operations.leaseToken, token))),
			);
		} catch {
			// An expired lease lets the daily worker recover even this failure.
		}
		return {
			ok: false,
			error: reportOgImageError('delete-failed', 'cleanup', undefined, undefined, id),
		};
	}
}

/** Pending uploads get a full day to settle before the worker fences late persistence. */
export async function reconcileProjectImages() {
	const started = Date.now();
	const budget = new ImageBudget(45_000);
	const origin = storeOrigin();
	const due = await budget.run(3000, () =>
		db
			.select()
			.from(operations)
			.where(
				and(
					eq(operations.storeOrigin, origin),
					ne(operations.state, 'complete'),
					lt(operations.leaseUntil, Date.now()),
					or(ne(operations.state, 'pending'), lt(operations.createdAt, Date.now() - DAY)),
				),
			)
			.orderBy(asc(operations.createdAt))
			.limit(100),
	);
	let failed = 0;
	let processed = 0;
	for (const operation of due) {
		try {
			budget.remaining(1);
		} catch {
			break;
		}
		try {
			if (operation.state === 'pending') {
				await budget.run(3000, () =>
					db
						.update(operations)
						.set({ state: 'abandoned', updatedAt: Date.now() })
						.where(
							and(eq(operations.id, operation.id), eq(operations.state, 'pending')),
						),
				);
			}
			const result = await cleanupImageOperation(operation.id, budget);
			if (!result.ok) failed++;
			processed++;
			if (!result.ok && operation.retryCount + 1 >= 7) {
				logOperation('error', {
					operation: 'project_image.reconciliation',
					classification: 'repeated-cleanup-failure',
					reference: operation.id,
				});
			}
		} catch {
			failed++;
			reportOgImageError('unexpected', 'cleanup');
		}
	}
	logOperation(failed ? 'warn' : 'info', {
		operation: 'project_image.reconciliation',
		classification: failed ? 'retry-pending' : 'complete',
		durationMs: Date.now() - started,
	});
	return { processed, failed };
}
