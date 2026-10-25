import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { fixtureUser, fixtureVisitor } from '../tests/fixtures/database';
import { readFile, writeFile, readdir } from 'node:fs/promises';

async function login(page: Page, user = fixtureUser) {
	await page.goto('/login');
	await page.getByLabel('Email:', { exact: true }).fill(user.email);
	await page.getByLabel('Password:', { exact: true }).fill(user.password);
	await page.getByRole('button', { name: 'Login!' }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
}

test('unauthenticated and non-admin sessions cannot access the CMS', async ({ page }) => {
	await page.goto('/dashboard/projects');
	await expect(page).toHaveURL(/\/login$/);
	await login(page, fixtureVisitor);
	await page.goto('/dashboard/projects');
	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
	await expect(page.getByText('Synthetic portfolio project', { exact: true })).toHaveCount(0);
});

test('invalid login has accessible feedback and restores the submit button', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Email:', { exact: true }).fill(fixtureUser.email);
	await page.getByLabel('Password:', { exact: true }).fill('incorrect');
	await page.getByRole('button', { name: 'Login!' }).click();
	await expect(page.getByRole('alert')).toHaveText(/Unable to sign in/);
	await expect(page.getByRole('button', { name: 'Login!' })).toBeEnabled();
});

for (const entity of [
	{
		path: 'projects',
		field: 'Título',
		create: 'Crear proyecto',
		name: 'Browser project',
		fields: { Descripción: 'Production-mode action fixture' },
	},
	{
		path: 'experiences',
		field: 'Puesto / Cargo',
		create: 'Crear experiencia',
		name: 'Browser role',
		fields: { Empresa: 'Browser Company', Descripción: 'Production-mode experience fixture' },
	},
	{
		path: 'skills',
		field: 'Nombre',
		create: 'Crear habilidad',
		name: 'Browser skill',
		fields: {},
	},
	{
		path: 'social-links',
		field: 'Nombre',
		create: 'Crear enlace',
		name: 'Browser social link',
		fields: { URL: 'https://example.test/browser' },
	},
] as const) {
	test(`${entity.path} create, edit and delete through real Server Actions`, async ({
		page,
	}, testInfo) => {
		await login(page);
		const name = `${entity.name} ${testInfo.project.name}`;
		await page.goto(`/dashboard/${entity.path}/new`);
		await page.getByRole('button', { name: entity.create, exact: true }).click();
		await expect(page.getByLabel(entity.field, { exact: true })).toBeFocused();
		await page.getByLabel(entity.field, { exact: true }).fill(name);
		for (const [label, value] of Object.entries(entity.fields))
			await page.getByLabel(label, { exact: true }).fill(value);
		await page.getByRole('button', { name: entity.create, exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`/dashboard/${entity.path}$`));
		const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
		await expect(row).toBeVisible();
		await row.getByRole('link', { name: 'Editar', exact: true }).click();
		await page.getByLabel(entity.field, { exact: true }).fill(`${name} edited`);
		await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
		const edited = page
			.getByRole('row')
			.filter({ has: page.getByText(`${name} edited`, { exact: true }) });
		await expect(edited).toBeVisible();
		page.once('dialog', (dialog) => dialog.accept());
		await edited.getByRole('button', { name: 'Eliminar', exact: true }).click();
		await expect(page.getByText(`${name} edited`, { exact: true })).toHaveCount(0);
	});
}

test('settings updates invalidate cached public content and unauthorized replay cannot mutate it', async ({
	page,
	playwright,
	baseURL,
}, testInfo) => {
	await login(page);
	const value = `Public cache freshness ${testInfo.project.name}`;
	await page.goto('/dashboard/settings');
	await page.getByLabel('Mensaje de estado').fill(value);
	const action = page.waitForRequest(
		(request) =>
			request.method() === 'POST' &&
			new URL(request.url()).pathname === '/dashboard/settings',
	);
	await page.getByRole('button', { name: 'Guardar configuración' }).click();
	const submitted = await action;
	await expect(page.getByLabel('Mensaje de estado')).toHaveValue(value);
	const anonymous = await playwright.request.newContext({
		baseURL,
		ignoreHTTPSErrors: baseURL === 'https://localhost:3443',
	});
	try {
		const headers = await submitted.allHeaders();
		const replayHeaders: Record<string, string> = {
			origin: baseURL!,
			cookie: '__Secure-better-auth.session_token=forged',
		};
		for (const key of ['content-type', 'next-action', 'next-router-state-tree'])
			if (headers[key]) replayHeaders[key] = headers[key];
		const originalBody = submitted.postDataBuffer()!.toString('utf8');
		const alteredBody = originalBody
			.replace(value, `Unauthorized ${value}`)
			.replace(encodeURIComponent(value), encodeURIComponent(`Unauthorized ${value}`));
		if (alteredBody === originalBody)
			throw new Error('The replay did not contain the expected mutation payload.');
		const response = await anonymous.post('/dashboard/settings', {
			headers: replayHeaders,
			data: Buffer.from(alteredBody),
			maxRedirects: 0,
		});
		expect(await response.text()).not.toContain(fixtureUser.email);
		const visitor = await anonymous.post('/api/auth/sign-in/email', {
			headers: { origin: baseURL! },
			data: { email: fixtureVisitor.email, password: fixtureVisitor.password },
		});
		expect(visitor.status()).toBe(200);
		delete replayHeaders.cookie;
		await anonymous.post('/dashboard/settings', {
			headers: replayHeaders,
			data: Buffer.from(alteredBody),
			maxRedirects: 0,
		});
		await page.reload();
		await expect(page.getByLabel('Mensaje de estado')).toHaveValue(value);
	} finally {
		await anonymous.dispose();
	}
	await page.goto('/');
	await page.getByRole('button', { name: 'About Me', exact: true }).first().click();
	await expect(page.getByText(value, { exact: true })).toBeVisible();
});

test('custom SVG uploads are normalized, replaced and cleaned after deletion', async ({
	page,
}, testInfo) => {
	await login(page);
	const name = `SVG fixture ${testInfo.project.name}`;
	await page.goto('/dashboard/skills/new');
	await page.getByLabel('Nombre', { exact: true }).fill(name);
	await page.getByRole('switch', { name: 'Usar icono personalizado', exact: true }).check();
	await page.getByLabel('Archivo del icono').setInputFiles({
		name: 'invalid.svg',
		mimeType: 'image/svg+xml',
		buffer: Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
		),
	});
	await page.getByRole('button', { name: 'Crear habilidad', exact: true }).click();
	await expect(page.getByRole('alert')).toBeVisible();
	await page.getByLabel('Archivo del icono').setInputFiles({
		name: 'icon.svg',
		mimeType: 'image/svg+xml',
		buffer: Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="red" d="M1 1h20v20H1z"/></svg>',
		),
	});
	await page.getByRole('button', { name: 'Crear habilidad', exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/skills$/);
	const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
	await expect(row.locator('svg').first()).toBeVisible();
	const directory = `${process.env.TEST_FIXTURE_DIRECTORY}/blobs/skill-icons`;
	const before = await readdir(directory);
	expect(before).toHaveLength(1);
	expect(await readFile(`${directory}/${before[0]}`, 'utf8')).not.toContain('fill="red"');
	await row.getByRole('link', { name: 'Editar', exact: true }).click();
	await page.getByLabel('Archivo del icono').setInputFiles({
		name: 'replacement.svg',
		mimeType: 'image/svg+xml',
		buffer: Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
		),
	});
	await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/skills$/);
	const after = await readdir(directory);
	expect(after).toHaveLength(1);
	expect(after[0]).not.toBe(before[0]);
	await page
		.getByRole('row')
		.filter({ has: page.getByText(name, { exact: true }) })
		.getByRole('button', { name: 'Eliminar', exact: true })
		.click();
	await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	expect(await readdir(directory)).toEqual([]);
});

test('project OG refresh persists its new image and deletes the replaced object', async ({
	page,
}, testInfo) => {
	await login(page);
	const name = `OG fixture ${testInfo.project.name}`;
	await page.goto('/dashboard/projects/new');
	await page.getByLabel('Título', { exact: true }).fill(name);
	await page.getByLabel('Descripción', { exact: true }).fill('Synthetic Open Graph journey');
	await page
		.getByLabel('URL del proyecto', { exact: true })
		.fill('https://example.com/ci-og-page');
	await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
	await expect(page).toHaveURL(/\/dashboard\/projects$/);
	const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
	const directory = `${process.env.TEST_FIXTURE_DIRECTORY}/blobs/og-images`;
	const previous = await readdir(directory);
	expect(previous).toHaveLength(1);
	await row
		.getByRole('button', { name: `Actualizar imagen Open Graph de ${name}`, exact: true })
		.click();
	await expect(
		row.getByRole('button', { name: `Actualizar imagen Open Graph de ${name}`, exact: true }),
	).toBeEnabled();
	await expect.poll(() => readdir(directory)).not.toEqual(previous);
	expect(await readdir(directory)).toHaveLength(1);
	page.once('dialog', (dialog) => dialog.accept());
	await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
	await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	expect(await readdir(directory)).toEqual([]);
});

test('a delayed cache miss streams the public loading state before real project data', async ({
	page,
}, testInfo) => {
	await login(page);
	const name = `Streaming fixture ${testInfo.project.name}`;
	const scenario = `${process.env.TEST_FIXTURE_DIRECTORY}/query.json`;
	try {
		await page.goto('/dashboard/projects/new');
		await page.getByLabel('Título', { exact: true }).fill(name);
		await page.getByLabel('Descripción', { exact: true }).fill('Delayed real SQL read');
		await writeFile(scenario, JSON.stringify({ operation: 'db.projects.read', delayMs: 2000 }));
		await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
		await expect(page).toHaveURL(/\/dashboard\/projects$/);
		await page.goto('/', { waitUntil: 'commit' });
		await expect(
			page.getByRole('status').filter({ hasText: 'Loading portfolio' }),
		).toBeVisible();
		await expect(page.getByText(name, { exact: true })).toBeAttached();
		await expect(page.getByRole('status').filter({ hasText: 'Loading portfolio' })).toHaveCount(
			0,
		);
	} finally {
		await writeFile(scenario, '{}');
		await page.goto('/dashboard/projects');
		const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
		page.once('dialog', (dialog) => dialog.accept());
		await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
	}
});

test('a server read failure shows generic feedback and recovers after reset', async ({ page }) => {
	await login(page);
	const scenario = `${process.env.TEST_FIXTURE_DIRECTORY}/query.json`;
	try {
		await writeFile(scenario, JSON.stringify({ operation: 'db.projects.read', fail: true }));
		await page.goto('/dashboard/projects');
		await expect(page.getByRole('alert')).toContainText('The request could not be completed');
		await expect(
			page.getByText('Synthetic database read failure', { exact: true }),
		).toHaveCount(0);
	} finally {
		await writeFile(scenario, '{}');
	}
	await page.getByRole('button', { name: 'Try again', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Proyectos', exact: true })).toBeVisible();
});

test('music refresh handles a provider failure and subsequent recovery', async ({ page }) => {
	await login(page);
	const scenario = `${process.env.TEST_FIXTURE_DIRECTORY}/music.txt`;
	try {
		await writeFile(scenario, 'failure');
		await page.goto('/dashboard/music-status');
		await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click();
		await expect(page.getByText('No disponible', { exact: true })).toBeVisible();
		await writeFile(scenario, 'empty');
		await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click();
		await expect(page.getByText('Sin canciones recientes', { exact: true })).toBeVisible();
	} finally {
		await writeFile(scenario, 'empty');
	}
});

for (const entity of [
	{
		path: 'projects',
		label: 'proyecto',
		name: 'Ordered project',
		field: 'Título',
		create: 'Crear proyecto',
	},
	{
		path: 'social-links',
		label: 'enlace',
		name: 'Ordered link',
		field: 'Nombre',
		create: 'Crear enlace',
	},
] as const) {
	test(`${entity.path} can be reordered with the keyboard and persist after reload`, async ({
		page,
	}, testInfo) => {
		await login(page);
		const name = `${entity.name} ${testInfo.project.name}`;
		await page.goto(`/dashboard/${entity.path}/new`);
		await page.getByLabel(entity.field, { exact: true }).fill(name);
		if (entity.path === 'projects')
			await page.getByLabel('Descripción', { exact: true }).fill('Keyboard ordering fixture');
		else await page.getByLabel('URL', { exact: true }).fill('https://example.test/ordered');
		await page.getByRole('button', { name: entity.create, exact: true }).click();
		await expect(page).toHaveURL(new RegExp(`/dashboard/${entity.path}$`));
		const handle = page.getByRole('button', {
			name: `Reordenar ${entity.label} "${name}"`,
			exact: true,
		});
		await handle.focus();
		await page.keyboard.press('Space');
		await page.keyboard.press('ArrowUp');
		await page.keyboard.press('Space');
		const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
		await expect(row.getByText('1', { exact: true })).toBeVisible();
		await expect(page.getByRole('table')).toHaveAttribute('aria-busy', 'false');
		await page.reload();
		await expect(
			page
				.getByRole('row')
				.filter({ has: page.getByText(name, { exact: true }) })
				.getByText('1', { exact: true }),
		).toBeVisible();
		page.once('dialog', (dialog) => dialog.accept());
		await page
			.getByRole('row')
			.filter({ has: page.getByText(name, { exact: true }) })
			.getByRole('button', { name: 'Eliminar', exact: true })
			.click();
		await expect(page.getByText(name, { exact: true })).toHaveCount(0);
	});
}
