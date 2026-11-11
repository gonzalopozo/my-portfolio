import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { required, verifiedOrigin } from './platform.mjs';
import { verifyPreview } from './preview-controller.mjs';

if (process.env.CIRCLECI || process.env.GITHUB_ACTIONS || process.env.VERCEL)
	throw new Error('Authenticated Preview acceptance must run locally.');
const { deployment } = await verifyPreview(required('DEPLOYMENT_ID'));
const origin = verifiedOrigin(deployment);
const child = spawn(
	'pnpm',
	['exec', 'playwright', 'test', '--config', 'playwright.csp.config.ts'],
	{
		stdio: 'inherit',
		env: {
			PATH: process.env.PATH,
			HOME: process.env.HOME,
			TMPDIR: process.env.TMPDIR,
			CI: 'true',
			NODE_ENV: 'production',
			CSP_TEST_BASE_URL: origin,
			PLAYWRIGHT_BASE_URL: origin,
			VERIFIED_PREVIEW_ORIGIN: origin,
			CSP_TEST_PREVIEW_BYPASS: required('VERCEL_AUTOMATION_BYPASS_SECRET'),
			CSP_TEST_ADMIN_EMAIL: required('PREVIEW_ADMIN_EMAIL'),
			CSP_TEST_ADMIN_PASSWORD: required('PREVIEW_ADMIN_PASSWORD'),
		},
	},
);
const [code] = await once(child, 'exit');
if (code !== 0) throw new Error('Local authenticated Preview acceptance failed.');
