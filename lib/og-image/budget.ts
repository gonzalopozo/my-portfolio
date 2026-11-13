import 'server-only';
import type { OgImageErrorCode } from '@/lib/og-image-feedback';

export class OgImageOperationError extends Error {
	constructor(
		readonly code: OgImageErrorCode,
		readonly httpStatus?: number,
	) {
		super(code);
	}
}

/** A deadline stops awaiting uncertain writes; it never implies their rollback. */
export class ImageBudget {
	private readonly deadline: number;
	constructor(milliseconds = 30_000) {
		this.deadline = Date.now() + milliseconds;
	}

	remaining(cap: number): number {
		const remaining = Math.min(cap, this.deadline - Date.now());
		if (remaining <= 0) throw new OgImageOperationError('timeout');
		return remaining;
	}

	async run<T>(cap: number, operation: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
		const controller = new AbortController();
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			const milliseconds = this.remaining(cap);
			return await Promise.race([
				Promise.resolve().then(() => {
					controller.signal.throwIfAborted();
					return operation(controller.signal);
				}),
				new Promise<never>((_, reject) => {
					timer = setTimeout(() => {
						controller.abort();
						reject(new OgImageOperationError('timeout'));
					}, milliseconds);
				}),
			]);
		} finally {
			clearTimeout(timer);
		}
	}
}
