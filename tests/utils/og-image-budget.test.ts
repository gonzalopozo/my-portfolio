import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { ImageBudget } from '@/lib/og-image/budget';
afterEach(() => vi.useRealTimers());
describe('shared image deadline', () => {
	it('limits later stages to the remaining total budget and aborts them', async () => {
		vi.useFakeTimers();
		const budget = new ImageBudget(100);
		vi.advanceTimersByTime(80);
		let signal: AbortSignal | undefined;
		const pending = budget.run(5000, (stageSignal) => {
			signal = stageSignal;
			return new Promise(() => {});
		});
		void pending.catch(() => {});
		await vi.advanceTimersByTimeAsync(20);
		await expect(pending).rejects.toMatchObject({ code: 'timeout' });
		expect(signal?.aborted).toBe(true);
	});
	it('does not start another side effect after the total deadline', async () => {
		vi.useFakeTimers();
		const budget = new ImageBudget(100);
		vi.advanceTimersByTime(101);
		const operation = vi.fn();
		await expect(budget.run(5000, operation)).rejects.toMatchObject({ code: 'timeout' });
		expect(operation).not.toHaveBeenCalled();
	});
});
