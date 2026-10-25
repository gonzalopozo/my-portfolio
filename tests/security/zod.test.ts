// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from '@/lib/zod';

afterEach(() => vi.restoreAllMocks());

describe('CSP-compatible validation', () => {
	it('constructs and parses schemas without probing or compiling runtime functions', () => {
		const functionConstructor = vi
			.spyOn(globalThis, 'Function')
			.mockImplementation(function () {
				throw new EvalError('Runtime code generation is disabled.');
			});
		const schema = z.object({
			name: z.string().trim().min(1),
			order: z.number().int().positive(),
		});

		expect(schema.parse({ name: ' Example ', order: 1 })).toEqual({
			name: 'Example',
			order: 1,
		});
		expect(schema.safeParse({ name: '', order: 0 }).success).toBe(false);
		expect(functionConstructor).not.toHaveBeenCalled();
	});
});
