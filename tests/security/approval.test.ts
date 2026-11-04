import { beforeEach, describe, expect, it, vi } from 'vitest';

const context = vi.hoisted(() => ({
	approved: true,
	reviewers: true,
	branches: ['main'],
	history: true,
	environmentId: 123 as number | undefined,
	approvalEnvironmentId: 123 as number | undefined,
	environmentName: 'production',
	approvalEnvironmentName: 'production',
}));
vi.mock('../../scripts/platform.mjs', () => ({
	required: (name: string) => (name === 'GITHUB_REPOSITORY' ? 'owner/repository' : '123'),
	api: async (_platform: string, path: string) => {
		if (path.endsWith('/deployment-branch-policies'))
			return { branch_policies: context.branches.map((name) => ({ name, type: 'branch' })) };
		if (path.endsWith('/approvals'))
			return context.history
				? [
						{
							state: context.approved ? 'approved' : 'rejected',
							environments: [
								{
									id: context.approvalEnvironmentId,
									name: context.approvalEnvironmentName,
								},
							],
						},
					]
				: [];
		return {
			id: context.environmentId,
			name: context.environmentName,
			protection_rules: context.reviewers
				? [{ type: 'required_reviewers', prevent_self_review: false, reviewers: [{}] }]
				: [],
			deployment_branch_policy: { custom_branch_policies: true },
		};
	},
}));
import { requireApprovalEnvironment } from '../../scripts/approval.mjs';

beforeEach(() =>
	Object.assign(context, {
		approved: true,
		reviewers: true,
		branches: ['main'],
		history: true,
		environmentId: 123,
		approvalEnvironmentId: 123,
		environmentName: 'production',
		approvalEnvironmentName: 'production',
	}),
);
describe('explicit human approval', () => {
	it('accepts a protected environment and recorded approval', async () => {
		await expect(requireApprovalEnvironment('production', true)).resolves.toBeUndefined();
	});
	it.each(['Production', 'PRODUCTION'])(
		'accepts approval for the same environment ID when its display name is %s',
		async (name) => {
			context.environmentName = name;
			context.approvalEnvironmentName = name;
			await expect(requireApprovalEnvironment('production', true)).resolves.toBeUndefined();
		},
	);
	it('rejects an approval for another environment ID even when the name matches', async () => {
		context.approvalEnvironmentId = 456;
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow(
			'No recorded human approval',
		);
	});
	it('rejects an approval without an environment ID', async () => {
		context.approvalEnvironmentId = undefined;
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow(
			'No recorded human approval',
		);
	});
	it.each([undefined, 0, -1, 1.5, Number.NaN])(
		'rejects an unproven environment identity (%s)',
		async (id) => {
			context.environmentId = id;
			await expect(requireApprovalEnvironment('production', true)).rejects.toThrow(
				'Environment identity is unproven',
			);
		},
	);
	it('rejects an environment created without reviewers', async () => {
		context.reviewers = false;
		await expect(requireApprovalEnvironment('production')).rejects.toThrow('owner approval');
	});
	it('rejects a broad branch policy', async () => {
		context.branches = ['*'];
		await expect(requireApprovalEnvironment('production')).rejects.toThrow('only the main');
	});
	it('rejects missing or rejected review history', async () => {
		context.history = false;
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow(
			'No recorded human approval',
		);
		context.history = true;
		context.approved = false;
		await expect(requireApprovalEnvironment('production', true)).rejects.toThrow(
			'No recorded human approval',
		);
	});
});
