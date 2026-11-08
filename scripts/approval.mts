import { required } from './platform.mjs';
import { circlePages, mainWorkflow, uuid, type WorkflowJob } from './ci-context.mjs';

/** Check the owner-approved hold in this exact workflow, including job-group prefixes. */
export async function requireApprovalEnvironment(name: string, approved = false) {
	const role =
		name === 'production-migrations'
			? 'approve-migrations'
			: name === 'production'
				? 'approve-production'
				: undefined;
	if (!role) throw new Error('Unknown production approval role.');
	const owner = uuid(required('CIRCLECI_APPROVER_ID'));
	const workflow = await mainWorkflow(
		name === 'production-migrations' ? ['release', 'baseline'] : ['release', 'rollback'],
	);
	const jobs = await circlePages<WorkflowJob>(`/api/v2/workflow/${workflow.id}/job`);
	const matches = jobs.filter(
		(job) =>
			job.type === 'approval' &&
			(job.name === role || new RegExp(`[/.:]${role}$`).test(job.name)),
	);
	if (matches.length !== 1) throw new Error(`Missing unique approval job for ${name}.`);
	const job = matches[0];
	uuid(job.id);
	if (!approved) return;
	const stopped = Date.parse(job.stopped_at ?? '');
	if (
		job.status !== 'success' ||
		job.approved_by !== owner ||
		!Number.isFinite(stopped) ||
		!Number.isFinite(Date.parse(workflow.created_at)) ||
		stopped < Date.parse(workflow.created_at) ||
		Date.now() - stopped < -300000 ||
		Date.now() - stopped >= 86400000
	)
		throw new Error(`No fresh recorded owner approval for ${name} in this workflow.`);
	return { jobId: job.id, approvedBy: owner, approvedAt: job.stopped_at };
}
