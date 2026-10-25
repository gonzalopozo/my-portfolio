import { api, required } from './platform.mjs';

/** Missing environment protection must fail closed, even if a job was allowed to start. */
export async function requireApprovalEnvironment(name: string, approved = false) {
	const repository = required('GITHUB_REPOSITORY');
	const path = `/repos/${repository}/environments/${encodeURIComponent(name)}`;
	const environment = await api<{
		protection_rules: { type: string; prevent_self_review?: boolean; reviewers?: unknown[] }[];
		deployment_branch_policy?: { custom_branch_policies: boolean };
	}>('github', path);
	const review = environment.protection_rules.find((rule) => rule.type === 'required_reviewers');
	if (
		!review?.reviewers?.length ||
		review.prevent_self_review ||
		!environment.deployment_branch_policy?.custom_branch_policies
	)
		throw new Error(
			`Configure required owner approval and a main-only branch policy for ${name}.`,
		);
	const branches = await api<{ branch_policies: { name: string; type?: string }[] }>(
		'github',
		`${path}/deployment-branch-policies`,
	);
	if (
		branches.branch_policies.length !== 1 ||
		branches.branch_policies[0].name !== 'main' ||
		(branches.branch_policies[0].type ?? 'branch') !== 'branch'
	)
		throw new Error(`Environment ${name} must allow only the main branch.`);
	if (approved) {
		const history = await api<{ state: string; environments: { name: string }[] }[]>(
			'github',
			`/repos/${repository}/actions/runs/${required('GITHUB_RUN_ID')}/approvals`,
		);
		if (
			!history.some(
				(review) =>
					review.state === 'approved' &&
					review.environments.some((environment) => environment.name === name),
			)
		)
			throw new Error(`No recorded human approval for ${name} in this workflow run.`);
	}
}
