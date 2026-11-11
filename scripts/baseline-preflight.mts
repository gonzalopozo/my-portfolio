import { mainWorkflow } from './ci-context.mjs';
import { requireApprovalEnvironment } from './approval.mjs';
import { commit, required } from './platform.mjs';
import { validateRelease } from './validate-release.mjs';

await mainWorkflow(['baseline']);
await requireApprovalEnvironment('production-migrations');
const sha = commit(required('EXPECTED_SHA'));
if (sha !== required('CIRCLE_SHA1'))
	throw new Error('Baseline controller differs from the requested main SHA.');
await validateRelease(sha);
