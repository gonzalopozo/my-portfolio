import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { observeOperation } from '@/lib/observability/operation';

describe('database error boundary', () => {
	it('removes SQL parameters and causes before an error can reach framework logs', async () => {
		const original = Object.assign(new Error('Failed query: private-record'), {
			params: ['private-token'],
			cause: new Error('private-password'),
		});
		const error = await observeOperation('db.projects.read', async () => {
			throw original;
		}).catch((failure: unknown) => failure);
		expect(error).toBeInstanceOf(Error);
		expect(String(error)).toContain('The database operation could not be completed.');
		expect(JSON.stringify(error)).not.toContain('private-');
		expect(error).not.toHaveProperty('cause');
	});
	it('preserves fixed public validation messages without copying arbitrary properties', async () => {
		const original = Object.assign(new Error('Project not found.'), {
			params: ['private-token'],
		});
		await expect(
			observeOperation('cms.projects.mutate', async () => {
				throw original;
			}),
		).rejects.toThrow('Project not found.');
	});
});
