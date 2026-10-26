import { expect, test } from './fixtures';

type Violation = { directive: string; source: string; disposition: string; route: string };
type EvidenceWindow = Window & {
	cspEvidence?: Violation[];
	cspInlineExecuted?: boolean;
	cspHandlerExecuted?: boolean;
	cspNonceExecuted?: boolean;
};

// Requires a separately authorized, protected preview or production-mode local server.
if (!process.env.CSP_TEST_BASE_URL) throw new Error('CSP_TEST_BASE_URL is required.');

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		const evidenceWindow = window as EvidenceWindow;
		evidenceWindow.cspEvidence = [];
		document.addEventListener('securitypolicyviolation', (event) => {
			let source = event.blockedURI;
			try {
				source = new URL(source).origin;
			} catch {
				/* inline/eval are source labels */
			}
			evidenceWindow.cspEvidence?.push({
				directive: event.effectiveDirective,
				source,
				disposition: event.disposition,
				route: location.pathname,
			});
		});
	});
});

test('public policy is static and the portfolio hydrates', async ({ page }, testInfo) => {
	const response = await page.goto('/');
	const responseHeaders = response?.headers() ?? {};
	const policy =
		responseHeaders['content-security-policy'] ??
		responseHeaders['content-security-policy-report-only'];
	expect(policy).toBeTruthy();
	expect(policy).not.toContain('nonce-');
	expect(policy).not.toContain('unsafe-eval');
	await expect(
		page.getByRole('heading', { name: 'Gonzalo Pozo — Full Stack Developer', exact: true }),
	).toBeAttached();
	// Section navigation exercises hydration, nuqs, grid layout, and Motion transitions.
	await page.getByRole('button', { name: 'About Me', exact: true }).first().click();
	await expect.poll(() => new URL(page.url()).searchParams.get('section')).toBe('About me');
	const evidence = await page.evaluate(() => (window as EvidenceWindow).cspEvidence ?? []);
	await testInfo.attach('csp-violations', {
		body: JSON.stringify(evidence),
		contentType: 'application/json',
	});
	expect(evidence).toEqual([]);
});

test('public enforced policy blocks script attributes while documenting permitted inline scripts', async ({
	page,
}) => {
	const response = await page.goto('/');
	expect(response?.headers()['content-security-policy']).toBeTruthy();
	await page.evaluate(() => {
		const button = document.createElement('button');
		button.setAttribute('onclick', 'window.cspHandlerExecuted = true');
		document.body.append(button);
		button.click();
		button.remove();
		const script = document.createElement('script');
		script.textContent = 'window.cspInlineExecuted = true';
		document.body.append(script);
		script.remove();
	});
	expect(await page.evaluate(() => (window as EvidenceWindow).cspHandlerExecuted)).not.toBe(true);
	expect(await page.evaluate(() => (window as EvidenceWindow).cspInlineExecuted)).toBe(true);
});

test('login receives the independent policy and rejects nonce-free scripts under enforcement', async ({
	page,
}) => {
	const response = await page.goto('/login');
	await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
	const responseHeaders = response?.headers() ?? {};
	const enforced = responseHeaders['content-security-policy'];
	const policy = enforced ?? responseHeaders['content-security-policy-report-only'];
	expect(policy).toBeTruthy();
	expect(policy).not.toContain('cartocdn.com');
	expect(policy).toContain('nonce-');
	const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
	expect(nonce).toBeTruthy();
	const scriptNonces = await page
		.locator('script')
		.evaluateAll((scripts) => scripts.map((script) => (script as HTMLScriptElement).nonce));
	expect(scriptNonces.length).toBeGreaterThan(0);
	expect(scriptNonces.every((value) => value === nonce)).toBe(true);
	expect(enforced).toBeTruthy();
	// Parser-inserted probes exercise CSP without page.evaluate's protocol bypass.
	await page.route(new URL('/login', page.url()).href, async (route) => {
		if (!route.request().isNavigationRequest()) return route.fallback();
		const upstream = await route.fetch();
		const upstreamPolicy = upstream.headers()['content-security-policy'] ?? '';
		const upstreamNonce = /'nonce-([^']+)'/.exec(upstreamPolicy)?.[1];
		if (!upstreamNonce)
			throw new Error('The login response requires an enforced nonce policy.');
		const html = await upstream.text();
		expect(html).toContain('</head>');
		await route.fulfill({
			response: upstream,
			body: html.replace(
				'</head>',
				`<script id="csp-inline-probe">window.cspInlineExecuted = true</script><script nonce="${upstreamNonce}">window.cspNonceExecuted = true</script></head>`,
			),
		});
	});
	const second = await page.reload();
	const secondPolicy = second?.headers()['content-security-policy'];
	expect(secondPolicy).toBeTruthy();
	expect(secondPolicy).not.toBe(policy);
	expect(await page.evaluate(() => (window as EvidenceWindow).cspNonceExecuted)).toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				(window as EvidenceWindow).cspEvidence?.some(
					(violation) =>
						['script-src', 'script-src-elem'].includes(violation.directive) &&
						violation.source === 'inline' &&
						violation.disposition === 'enforce' &&
						violation.route === '/login',
				),
			),
		)
		.toBe(true);
	expect(await page.evaluate(() => (window as EvidenceWindow).cspInlineExecuted)).not.toBe(true);
});

test('forged session cookies do not expose administrative data or create redirect loops', async ({
	page,
	context,
}) => {
	await context.addCookies([
		{
			name: 'better-auth.session_token',
			value: 'invalid-session',
			url: process.env.CSP_TEST_BASE_URL!,
		},
		{
			name: '__Secure-better-auth.session_token',
			value: 'invalid-session',
			url: process.env.CSP_TEST_BASE_URL!,
			secure: true,
		},
	]);
	await page.goto('/dashboard/projects');
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
});

test('login and logout work across document boundaries', async ({ page }) => {
	if (!process.env.CSP_TEST_ADMIN_EMAIL || !process.env.CSP_TEST_ADMIN_PASSWORD)
		throw new Error('Dedicated test administrator credentials are required.');
	await page.goto('/login');
	await page.getByLabel('Email:', { exact: true }).fill(process.env.CSP_TEST_ADMIN_EMAIL!);
	await page.getByLabel('Password:', { exact: true }).fill(process.env.CSP_TEST_ADMIN_PASSWORD!);
	await page.getByRole('button', { name: 'Login!' }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByRole('heading', { name: 'You are logged in:' })).toBeVisible();
	await page.getByRole('button', { name: 'Sign out!' }).click();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
});
