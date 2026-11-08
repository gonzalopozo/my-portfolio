import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Context from '../../scripts/ci-context.mjs';

const fixture = vi.hoisted(() => ({ mainWorkflow: vi.fn() }));
vi.mock('../../scripts/ci-context.mjs', async (importOriginal) => ({
	...(await importOriginal<typeof Context>()),
	mainWorkflow: fixture.mainWorkflow,
}));
import { requireApprovalEnvironment } from '../../scripts/approval.mjs';

const owner = '11111111-1111-4111-8111-111111111111';
const workflowId = '22222222-2222-4222-8222-222222222222';
const jobId = '33333333-3333-4333-8333-333333333333';
const fetch = vi.fn<typeof globalThis.fetch>();
let job: Record<string, unknown>;

beforeEach(() => {
	vi.resetAllMocks();
	vi.stubEnv('CIRCLECI_APPROVER_ID', owner);
	vi.stubEnv('CIRCLECI_READ_TOKEN', 'synthetic-read-only-token');
	vi.stubGlobal('fetch', fetch);
	fixture.mainWorkflow.mockResolvedValue({
		id: workflowId,
		created_at: new Date(Date.now() - 60000).toISOString(),
	});
	job = {
		id: jobId,
		name: 'release-flow.approve-production',
		type: 'approval',
		status: 'success',
		approved_by: owner,
		stopped_at: new Date(Date.now() - 1000).toISOString(),
	};
	fetch.mockImplementation(async () => Response.json({ items: [job] }));
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('CircleCI human approval', () => {
	it('returns owner and hold identity for the current production workflow', async () => {
		await expect(requireApprovalEnvironment('production', true)).resolves.toMatchObject({
			jobId,
			approvedBy: owner,
		});
		expect(fixture.mainWorkflow).toHaveBeenCalledWith(['release', 'rollback']);
		expect(fetch.mock.calls[0][0].toString()).toContain(`/workflow/${workflowId}/job`);
	});
	it('allows an unapproved hold only during preflight', async () => {
		job.status = 'on_hold';
		delete job.approved_by;
		await expect(requireApprovalEnvironment('production')).resolves.toBeUndefined();
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('approval');
	});
	it.each(['failed', 'canceled', 'not_run', 'on_hold'])('rejects status %s', async (status) => {
		job.status = status;
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('approval');
	});
	it('rejects an approval by another actor', async () => {
		job.approved_by = workflowId;
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('owner');
	});
	it('rejects an approval for the other production role', async () => {
		job.name = 'release-flow.approve-migrations';
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('unique');
	});
	it.each([undefined, 'invalid', new Date(Date.now() - 86400001).toISOString()])(
		'rejects a missing, invalid or expired approval time (%s)',
		async (time) => {
			job.stopped_at = time;
			await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('fresh');
		},
	);
	it('rejects duplicate approval jobs', async () => {
		fetch.mockResolvedValueOnce(Response.json({ items: [job, { ...job, id: owner }] }));
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('unique');
	});
	it('propagates a workflow/source mismatch without accepting the hold', async () => {
		fixture.mainWorkflow.mockRejectedValueOnce(new Error('Workflow identity mismatch.'));
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow('identity');
		expect(fetch).not.toHaveBeenCalled();
	});
});
