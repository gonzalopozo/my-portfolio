import { timingSafeEqual } from 'node:crypto';
import { reconcileProjectImages } from '@/lib/og-image/store';
import { reportOgImageError } from '@/lib/og-image-errors';

export const maxDuration = 60;

/** Cron has its own credential boundary and never depends on an admin cookie. */
export async function GET(request: Request) {
	const secret = process.env.CRON_SECRET;
	const supplied = Buffer.from(request.headers.get('authorization') ?? '');
	const expected = Buffer.from(`Bearer ${secret ?? ''}`);
	const headers = { 'Cache-Control': 'no-store' };
	if (!secret || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
		return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
	}
	try {
		return Response.json(await reconcileProjectImages(), { headers });
	} catch {
		const error = reportOgImageError('unexpected', 'cleanup');
		return Response.json(
			{ error: 'Reconciliation unavailable', reference: error.reference },
			{ status: 503, headers },
		);
	}
}
