import { describe, expect, it, vi } from 'vitest';
import { logOperation } from '@/lib/observability/logger';

describe('operation log privacy', () => {
	it('uses an allowlist even when arbitrary fields reach the logging boundary', () => {
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		try {
			const fields = {
				operation: 'db.projects.read',
				classification: 'failure',
				password: 'private-token',
			};
			logOperation('error', fields);
			expect(spy).toHaveBeenCalledOnce();
			expect(JSON.stringify(spy.mock.calls)).not.toContain('private-token');
		} finally {
			spy.mockRestore();
		}
	});
});
