import type { Page, Response } from '@playwright/test';
import { test, expect } from './fixtures';
import { fixtureUser, fixtureVisitor } from '../tests/fixtures/database';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import { getTestNamespace, writeFixtureScenario } from './fixture-support';

test.describe.configure({ mode: 'parallel' });

type EntityPath = 'projects' | 'experiences' | 'skills' | 'social-links';

async function deleteOwnedRows(page: Page, path: EntityPath, names: string[]) {
	await page.goto(`/dashboard/${path}`);
	for (const name of names) {
		const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
		if ((await row.count()) === 0) continue;
		page.once('dialog', (dialog) => dialog.accept());
		await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
		await expect(row).toHaveCount(0);
	}
}

async function saveSettings(page: Page) {
	const [response] = await Promise.all([
		page.waitForResponse(
			(response) =>
				response.request().method() === 'POST' &&
				new URL(response.url()).pathname === '/dashboard/settings',
		),
		page.getByRole('button', { name: 'Guardar configuración' }).click(),
	]);
	expect(response.ok()).toBe(true);
	await response.finished();
}

async function restoreTrailingRow(
	page: Page,
	path: 'projects' | 'social-links',
	label: string,
	name: string,
) {
	await page.goto(`/dashboard/${path}`);
	const row = page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
	if ((await row.count()) === 0) return;
	const lastRow = page.getByRole('row').last();
	if ((await lastRow.getByText(name, { exact: true }).count()) > 0) return;
	const bounds = await row.boundingBox();
	if (!bounds) throw new Error('The ordering fixture has no visible row during cleanup.');
	await page.getByRole('button', { name: `Reordenar ${label} "${name}"`, exact: true }).focus();
	await page.keyboard.press('Space');
	for (let step = 0; step <= Math.ceil(bounds.height / 10); step++) {
		await page.keyboard.press('ArrowDown');
	}
	await Promise.all([
		page.waitForResponse(
			(response) =>
				response.request().method() === 'POST' &&
				new URL(response.url()).pathname === `/dashboard/${path}`,
		),
		page.keyboard.press('Space'),
	]);
	await expect(page.getByRole('table')).toHaveAttribute('aria-busy', 'false');
	await page.reload();
	await expect(page.getByRole('row').last()).toContainText(name);
	await expect(row.getByText('2', { exact: true })).toBeVisible();
}

async function login(page: Page, user = fixtureUser) {
	await page.goto('/login');
	await page.getByLabel('Email:', { exact: true }).fill(user.email);
	await page.getByLabel('Password:', { exact: true }).fill(user.password);
	await page.getByRole('button', { name: 'Login!' }).click();
	await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectDashboardToFitViewport(page: Page) {
	const viewport = page.viewportSize();
	if (!viewport) throw new Error('The CMS tests require a fixed viewport.');
	await expect
		.poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
			message: 'Wide CMS tables should scroll internally without expanding the page.',
		})
		.toBeLessThanOrEqual(viewport.width + 1);
}

async function snapshotBlobDirectory(folder: 'skill-icons' | 'og-images') {
	const directory = `${process.env.TEST_FIXTURE_DIRECTORY}/blobs/${folder}`;
	await mkdir(directory, { recursive: true });
	// Retries share storage with earlier attempts; assert against this attempt's baseline.
	const existing = (await readdir(directory)).sort();
	return { directory, existing };
}

test(
	'CMS icon changes render publicly without loading icon catalogs in the browser',
	{ lock: 'cms-social-links' },
	async ({ page, context }, testInfo) => {
		await login(page);
		const name = `CMS icon selection ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
		const publicPage = await context.newPage();
		let editUrl = '';
		let savedSvg = '';

		try {
			for (const [index, iconName] of ['TbAbacus', 'BiAlarm'].entries()) {
				await page.goto(index === 0 ? '/dashboard/social-links/new' : editUrl);
				if (index === 0) {
					await page.getByLabel('Nombre', { exact: true }).fill(name);
					await page
						.getByLabel('URL', { exact: true })
						.fill('https://example.test/cms-icon');
				}
				const picker = page.getByRole('combobox', {
					name: /Select an icon|Selected icon:/,
				});
				if (savedSvg) {
					// The saved preview loads after hydration; wait before interacting with the picker.
					await expect
						.poll(() =>
							picker
								.locator('svg')
								.first()
								.evaluate((svg) => svg.innerHTML),
						)
						.toBe(savedSvg);
				}
				await picker.click();
				await page.getByPlaceholder('Search icons…').fill(iconName);
				const option = page.getByRole('option', { name: new RegExp(`^${iconName}\\b`) });
				await expect(option.locator('svg')).toHaveCount(1);
				const expectedSvg = await option.locator('svg').evaluate((svg) => svg.innerHTML);
				await option.click();
				await page
					.getByRole('button', {
						name: index === 0 ? 'Crear enlace' : 'Guardar cambios',
						exact: true,
					})
					.click();
				await expect(page).toHaveURL(/\/dashboard\/social-links$/);
				const row = page
					.getByRole('row')
					.filter({ has: page.getByText(name, { exact: true }) });
				await expect(row).toBeVisible();
				await expectDashboardToFitViewport(page);
				editUrl = (await row
					.getByRole('link', { name: 'Editar', exact: true })
					.getAttribute('href'))!;
				savedSvg = expectedSvg;

				const scripts: Promise<string>[] = [];
				const collectScript = (response: Response) => {
					if (response.request().resourceType() === 'script')
						scripts.push(response.text());
				};
				publicPage.on('response', collectScript);
				await publicPage.goto('/?section=About+me');
				const card = publicPage.locator('[data-portfolio-card]').filter({
					has: publicPage.getByRole('link', { name: `Visit ${name}`, exact: true }),
				});
				const icon = card.locator('svg').first();
				await expect(icon).toBeVisible();
				await expect.poll(() => icon.evaluate((svg) => svg.innerHTML)).toBe(expectedSvg);
				publicPage.off('response', collectScript);
				const source = (await Promise.all(scripts)).join('\n');
				// Full react-icons packs export their catalogs by name, even in minified chunks.
				expect(source).not.toMatch(/\bTbAbacus\b|\bBiAlarm\b|Selected icon:|Search icons…/);
			}
		} finally {
			try {
				await publicPage.close();
			} finally {
				await deleteOwnedRows(page, 'social-links', [name]);
			}
		}
	},
);

test('unauthenticated and non-admin sessions cannot access the CMS', async ({ page }) => {
	await page.goto('/dashboard/projects');
	await expect(page).toHaveURL(/\/login$/);
	await login(page, fixtureVisitor);
	await page.goto('/dashboard/projects');
	await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
	await expect(page.getByText('Synthetic portfolio project', { exact: true })).toHaveCount(0);
});

test('invalid login has accessible feedback and restores the submit button', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Email:', { exact: true }).fill(fixtureUser.email);
	await page.getByLabel('Password:', { exact: true }).fill('incorrect');
	await page.getByRole('button', { name: 'Login!' }).click();
	await expect(page.getByRole('alert').filter({ hasText: /Unable to sign in/ })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Login!' })).toBeEnabled();
});

for (const entity of [
	{
		path: 'projects',
		lock: 'cms-projects',
		field: 'Título',
		create: 'Crear proyecto',
		name: 'Browser project',
		fields: { Descripción: 'Production-mode action fixture' },
	},
	{
		path: 'experiences',
		lock: undefined,
		field: 'Puesto / Cargo',
		create: 'Crear experiencia',
		name: 'Browser role',
		fields: { Empresa: 'Browser Company', Descripción: 'Production-mode experience fixture' },
	},
	{
		path: 'skills',
		lock: undefined,
		field: 'Nombre',
		create: 'Crear habilidad',
		name: 'Browser skill',
		fields: {},
	},
	{
		path: 'social-links',
		lock: 'cms-social-links',
		field: 'Nombre',
		create: 'Crear enlace',
		name: 'Browser social link',
		fields: { URL: 'https://example.test/browser' },
	},
] as const) {
	test(
		`${entity.path} create, edit and delete through real Server Actions`,
		{ lock: entity.lock },
		async ({ page }, testInfo) => {
			await login(page);
			const name = `${entity.name} ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
			try {
				await page.goto(`/dashboard/${entity.path}/new`);
				await page.getByRole('button', { name: entity.create, exact: true }).click();
				await expect(page.getByLabel(entity.field, { exact: true })).toBeFocused();
				await page.getByLabel(entity.field, { exact: true }).fill(name);
				for (const [label, value] of Object.entries(entity.fields))
					await page.getByLabel(label, { exact: true }).fill(value);
				await page.getByRole('button', { name: entity.create, exact: true }).click();
				await expect(page).toHaveURL(new RegExp(`/dashboard/${entity.path}$`));
				const row = page
					.getByRole('row')
					.filter({ has: page.getByText(name, { exact: true }) });
				await expect(row).toBeVisible();
				await expectDashboardToFitViewport(page);
				await row.getByRole('link', { name: 'Editar', exact: true }).click();
				await page.getByRole('textbox', { name: entity.field }).fill(`${name} edited`);
				await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
				const edited = page
					.getByRole('row')
					.filter({ has: page.getByText(`${name} edited`, { exact: true }) });
				await expect(edited).toBeVisible();
				page.once('dialog', (dialog) => dialog.accept());
				await edited.getByRole('button', { name: 'Eliminar', exact: true }).click();
				await expect(page.getByText(`${name} edited`, { exact: true })).toHaveCount(0);
			} finally {
				await deleteOwnedRows(page, entity.path, [name, `${name} edited`]);
			}
		},
	);
}

test(
	'settings updates invalidate cached public content and unauthorized replay cannot mutate it',
	{ lock: 'cms-settings' },
	async ({ page, playwright, baseURL, clientHeaders }, testInfo) => {
		await login(page);
		const value = `Public cache freshness ${getTestNamespace(testInfo)}`;
		await page.goto('/dashboard/settings');
		const original = {
			statusMessage: await page.getByLabel('Mensaje de estado').inputValue(),
			resumeUrl: await page.getByLabel('URL del currículum').inputValue(),
			isEmployed: await page.getByRole('switch').isChecked(),
		};
		try {
			await page.getByLabel('Mensaje de estado').click();
			await page.getByLabel('Mensaje de estado').fill(value);
			await expect(page.getByLabel('Mensaje de estado')).toHaveValue(value);
			const action = page.waitForRequest(
				(request) =>
					request.method() === 'POST' &&
					new URL(request.url()).pathname === '/dashboard/settings',
			);
			await saveSettings(page);
			const submitted = await action;
			await expect(page.getByLabel('Mensaje de estado')).toHaveValue(value);
			const anonymous = await playwright.request.newContext({
				baseURL,
				ignoreHTTPSErrors: baseURL === 'https://localhost:3443',
				extraHTTPHeaders: clientHeaders,
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
					.replace(
						encodeURIComponent(value),
						encodeURIComponent(`Unauthorized ${value}`),
					);
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
			await expect(page.getByRole('status').filter({ hasText: value })).toBeVisible();
		} finally {
			await page.goto('/dashboard/settings');
			await page.getByLabel('Mensaje de estado').fill(original.statusMessage);
			await page.getByLabel('URL del currículum').fill(original.resumeUrl);
			await page.getByRole('switch').setChecked(original.isEmployed);
			await saveSettings(page);
			await page.reload();
			await expect(page.getByLabel('Mensaje de estado')).toHaveValue(original.statusMessage);
			await expect(page.getByLabel('URL del currículum')).toHaveValue(original.resumeUrl);
			await expect(page.getByRole('switch')).toBeChecked({ checked: original.isEmployed });
		}
	},
);

test(
	'custom SVG uploads are normalized, replaced and cleaned after deletion',
	{ lock: 'blob-skill-icons' },
	async ({ page }, testInfo) => {
		await login(page);
		const name = `SVG fixture ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
		const { directory, existing } = await snapshotBlobDirectory('skill-icons');
		try {
			await page.goto('/dashboard/skills/new');
			await page.getByLabel('Nombre', { exact: true }).fill(name);
			await page
				.getByRole('switch', { name: 'Usar icono personalizado', exact: true })
				.check();
			await page.getByLabel('Archivo del icono').setInputFiles({
				name: 'invalid.svg',
				mimeType: 'image/svg+xml',
				buffer: Buffer.from(
					'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
				),
			});
			await page.getByRole('button', { name: 'Crear habilidad', exact: true }).click();
			await expect(page.getByRole('alert').filter({ hasText: /SVG/ })).toBeVisible();
			expect((await readdir(directory)).sort()).toEqual(existing);
			await page.getByLabel('Nombre', { exact: true }).fill(name);
			await page.getByLabel('Archivo del icono').setInputFiles({
				name: 'icon.svg',
				mimeType: 'image/svg+xml',
				buffer: Buffer.from(
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="red" d="M1 1h20v20H1z"/></svg>',
				),
			});
			await page.getByRole('button', { name: 'Crear habilidad', exact: true }).click();
			await expect(page).toHaveURL(/\/dashboard\/skills$/);
			const row = page
				.getByRole('row')
				.filter({ has: page.getByText(name, { exact: true }) });
			await expect(row.locator('svg').first()).toBeVisible();
			await expectDashboardToFitViewport(page);
			const before = (await readdir(directory)).filter((file) => !existing.includes(file));
			expect(before).toHaveLength(1);
			expect(await readFile(`${directory}/${before[0]}`, 'utf8')).not.toContain('fill="red"');
			await row.getByRole('link', { name: 'Editar', exact: true }).click();
			await expect(
				page.getByRole('heading', { name: 'Editar Habilidad', exact: true }),
			).toBeVisible();
			await page
				.getByLabel('Archivo del icono')
				.filter({ visible: true })
				.setInputFiles({
					name: 'replacement.svg',
					mimeType: 'image/svg+xml',
					buffer: Buffer.from(
						'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
					),
				});
			await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
			await expect(page).toHaveURL(/\/dashboard\/skills$/);
			await expectDashboardToFitViewport(page);
			const after = (await readdir(directory)).filter((file) => !existing.includes(file));
			expect(after).toHaveLength(1);
			expect(after[0]).not.toBe(before[0]);
			await page
				.getByRole('row')
				.filter({ has: page.getByText(name, { exact: true }) })
				.getByRole('button', { name: 'Eliminar', exact: true })
				.click();
			await expect(row).toHaveCount(0);
			await expect.poll(async () => (await readdir(directory)).sort()).toEqual(existing);
		} finally {
			await deleteOwnedRows(page, 'skills', [name]);
		}
	},
);

test(
	'project OG refresh persists its new image and deletes the replaced object',
	{ lock: 'cms-projects' },
	async ({ page }, testInfo) => {
		await login(page);
		const name = `OG fixture ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
		const { directory, existing } = await snapshotBlobDirectory('og-images');
		try {
			await page.goto('/dashboard/projects/new');
			await page.getByLabel('Título', { exact: true }).fill(name);
			await page
				.getByLabel('Descripción', { exact: true })
				.fill('Synthetic Open Graph journey');
			await page
				.getByLabel('URL del proyecto', { exact: true })
				.fill('https://example.com/ci-og-page');
			await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
			await expect(page).toHaveURL(/\/dashboard\/projects$/);
			const row = page
				.getByRole('row')
				.filter({ has: page.getByText(name, { exact: true }) });
			await expect(row).toBeVisible();
			await expectDashboardToFitViewport(page);
			const previous = (await readdir(directory)).filter((file) => !existing.includes(file));
			expect(previous).toHaveLength(1);
			await Promise.all([
				page.waitForResponse(
					(response) =>
						response.request().method() === 'POST' &&
						new URL(response.url()).pathname === '/dashboard/projects',
				),
				row
					.getByRole('button', {
						name: `Actualizar imagen Open Graph de ${name}`,
						exact: true,
					})
					.click(),
			]);
			await expect(
				row.getByRole('button', {
					name: `Actualizar imagen Open Graph de ${name}`,
					exact: true,
				}),
			).toBeEnabled();
			await expect(
				page.locator('[data-sonner-toast][data-type="success"]').filter({ hasText: name }),
			).toBeVisible();
			const readImages = async () =>
				(await readdir(directory)).filter((file) => !existing.includes(file));
			await expect.poll(readImages).not.toEqual(previous);
			expect(await readImages()).toHaveLength(1);
			page.once('dialog', (dialog) => dialog.accept());
			await row.getByRole('button', { name: 'Eliminar', exact: true }).click();
			await expect(page.getByText(name, { exact: true })).toHaveCount(0);
			await expect.poll(async () => (await readdir(directory)).sort()).toEqual(existing);
		} finally {
			await deleteOwnedRows(page, 'projects', [name]);
		}
	},
);

test(
	'a delayed cache miss returns public card HTML before hydration',
	{ lock: 'cms-projects' },
	async ({ page }, testInfo) => {
		await login(page);
		const name = `Streaming fixture ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
		try {
			await page.goto('/dashboard/projects/new');
			await page.getByLabel('Título', { exact: true }).fill(name);
			await page.getByLabel('Descripción', { exact: true }).fill('Delayed real SQL read');
			await writeFixtureScenario(
				'query.json',
				JSON.stringify({ operation: 'db.projects.read.public', delayMs: 2000 }),
			);
			await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
			await expect(page).toHaveURL(/\/dashboard\/projects$/);
			await expectDashboardToFitViewport(page);
			const response = await page.request.get('/');
			expect(response.status()).toBe(200);
			const html = await response.text();
			expect(html).toContain('data-portfolio-grid="true"');
			expect(html).toContain(name);
			await page.goto('/?section=Projects');
			await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
		} finally {
			await writeFixtureScenario('query.json', '{}');
			try {
				await page.goto('/dashboard/projects');
				const row = page
					.getByRole('row')
					.filter({ has: page.getByText(name, { exact: true }) });
				await expect(row).toBeVisible();
				await expectDashboardToFitViewport(page);
			} finally {
				await deleteOwnedRows(page, 'projects', [name]);
			}
		}
	},
);

test(
	'a server read failure shows generic feedback and recovers after reset',
	{ lock: 'cms-projects' },
	async ({ page }) => {
		await login(page);
		try {
			await writeFixtureScenario(
				'query.json',
				JSON.stringify({ operation: 'db.projects.read.admin', fail: true }),
			);
			await page.goto('/dashboard/projects');
			await expect(
				page.getByRole('alert').filter({ hasText: 'The request could not be completed' }),
			).toBeVisible();
			await expect(
				page.getByText('Synthetic database read failure', { exact: true }),
			).toHaveCount(0);
		} finally {
			await writeFixtureScenario('query.json', '{}');
		}
		await page.getByRole('button', { name: 'Try again', exact: true }).click();
		await expect(page.getByRole('heading', { name: 'Proyectos', exact: true })).toBeVisible();
	},
);

test(
	'music refresh handles a provider failure and subsequent recovery',
	{ lock: 'music-scenario' },
	async ({ page }) => {
		await login(page);
		try {
			await writeFixtureScenario('music.txt', 'failure');
			await page.goto('/dashboard/music-status');
			await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click();
			await expect(page.getByText('No disponible', { exact: true })).toBeVisible();
			await writeFixtureScenario('music.txt', 'empty');
			await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click();
			await expect(page.getByText('Sin canciones recientes', { exact: true })).toBeVisible();
		} finally {
			await writeFixtureScenario('music.txt', 'empty');
			await page.goto('/dashboard/music-status');
			await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click();
			await expect(page.getByText('Sin canciones recientes', { exact: true })).toBeVisible();
		}
	},
);

for (const entity of [
	{
		path: 'projects',
		lock: 'cms-projects',
		label: 'proyecto',
		name: 'Ordered project',
		field: 'Título',
		create: 'Crear proyecto',
	},
	{
		path: 'social-links',
		lock: 'cms-social-links',
		label: 'enlace',
		name: 'Ordered link',
		field: 'Nombre',
		create: 'Crear enlace',
	},
] as const) {
	test(
		`${entity.path} can be reordered with the keyboard and persist after reload`,
		{ lock: entity.lock },
		async ({ page }, testInfo) => {
			await login(page);
			const name = `${entity.name} ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
			try {
				await page.goto(`/dashboard/${entity.path}/new`);
				await page.getByLabel(entity.field, { exact: true }).fill(name);
				if (entity.path === 'projects')
					await page
						.getByLabel('Descripción', { exact: true })
						.fill('Keyboard ordering fixture');
				else
					await page
						.getByLabel('URL', { exact: true })
						.fill('https://example.test/ordered');
				await page.getByRole('button', { name: entity.create, exact: true }).click();
				await expect(page).toHaveURL(new RegExp(`/dashboard/${entity.path}$`));
				const row = page
					.getByRole('row')
					.filter({ has: page.getByText(name, { exact: true }) });
				await expect(row).toBeVisible();
				await expectDashboardToFitViewport(page);
				const initialBounds = await row.boundingBox();
				if (!initialBounds) throw new Error('The ordering fixture has no visible row.');
				const handle = page.getByRole('button', {
					name: `Reordenar ${entity.label} "${name}"`,
					exact: true,
				});
				await expect(handle).toHaveAttribute('aria-pressed', 'false');
				await handle.focus();
				await page.keyboard.press('Space');
				await expect(handle).toHaveAttribute('aria-pressed', 'true');
				// The keyboard sensor moves in 10px steps; cross the preceding row's center
				// before dropping instead of assuming one key press moves an entire row.
				for (let step = 0; step <= Math.ceil(initialBounds.height / 10); step++) {
					await page.keyboard.press('ArrowUp');
				}
				await expect
					.poll(async () => (await row.boundingBox())?.y ?? Infinity)
					.toBeLessThan(initialBounds.y - initialBounds.height / 2);
				await Promise.all([
					page.waitForResponse(
						(response) =>
							response.request().method() === 'POST' &&
							new URL(response.url()).pathname === `/dashboard/${entity.path}`,
					),
					page.keyboard.press('Space'),
				]);
				await expect(handle).toHaveAttribute('aria-pressed', 'false');
				await expect(row.getByText('1', { exact: true })).toBeVisible();
				await expect(page.getByRole('table')).toHaveAttribute('aria-busy', 'false');
				await page.reload();
				await expectDashboardToFitViewport(page);
				await expect(
					page
						.getByRole('row')
						.filter({ has: page.getByText(name, { exact: true }) })
						.getByText('1', { exact: true }),
				).toBeVisible();
			} finally {
				try {
					await restoreTrailingRow(page, entity.path, entity.label, name);
				} finally {
					await deleteOwnedRows(page, entity.path, [name]);
				}
				await expect(page.getByText(name, { exact: true })).toHaveCount(0);
			}
		},
	);
}

test(
	'OG errors expose details and pending notifications disappear on public navigation',
	{ lock: 'cms-projects' },
	async ({ page }, testInfo) => {
		await login(page);
		const name = `OG notification ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
		const release = Promise.withResolvers<void>();
		try {
			await page.goto('/dashboard/projects/new');
			await page.getByLabel('Título', { exact: true }).fill(name);
			await page
				.getByLabel('Descripción', { exact: true })
				.fill('Project without an image source');
			await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
			await expect(page).toHaveURL(/\/dashboard\/projects$/);
			const row = page
				.getByRole('row')
				.filter({ has: page.getByText(name, { exact: true }) });
			const refresh = row.getByRole('button', {
				name: `Actualizar imagen Open Graph de ${name}`,
				exact: true,
			});
			await refresh.click();
			const errorToast = page
				.locator('[data-sonner-toast][data-type="error"]')
				.filter({ hasText: name });
			await expect(errorToast).toBeVisible();
			await errorToast.getByRole('button', { name: 'Ver detalles' }).click();
			const alert = page.getByRole('alert').filter({ hasText: name });
			await expect(alert).toBeFocused();
			await expect(alert).toContainText('no tiene un enlace de origen');
			await alert.getByRole('button', { name: 'Cerrar aviso' }).click();
			await expect(errorToast).toHaveCount(0);

			const arrived = Promise.withResolvers<void>();
			await page.route('**/dashboard/projects', async (route) => {
				if (
					route.request().method() !== 'POST' ||
					!route.request().headers()['next-action']
				) {
					return route.continue();
				}
				arrived.resolve();
				await release.promise;
				await route.abort().catch(() => {});
			});
			await refresh.click();
			await arrived.promise;
			await expect(
				page.locator('[data-sonner-toast][data-type="loading"]').filter({ hasText: name }),
			).toBeVisible();
			await page.goto('/');
			release.resolve();
			await expect(page.getByRole('main')).toBeVisible();
			await expect(page.locator('[data-sonner-toaster]')).toHaveCount(0);
			await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
		} finally {
			release.resolve();
			await page.unroute('**/dashboard/projects');
			await deleteOwnedRows(page, 'projects', [name]);
		}
	},
);

test(
	'a rejected OG request asks for reload without claiming that the mutation failed',
	{ lock: 'cms-projects' },
	async ({ page }, testInfo) => {
		await login(page);
		const name = `OG uncertain notification ${testInfo.project.name} ${getTestNamespace(testInfo)}`;
		try {
			await page.goto('/dashboard/projects/new');
			await page.getByLabel('Título', { exact: true }).fill(name);
			await page
				.getByLabel('Descripción', { exact: true })
				.fill('Lost response notification journey');
			await page.getByRole('button', { name: 'Crear proyecto', exact: true }).click();
			await expect(page).toHaveURL(/\/dashboard\/projects$/);
			const row = page
				.getByRole('row')
				.filter({ has: page.getByText(name, { exact: true }) });
			await page.route('**/dashboard/projects', (route) => {
				if (route.request().method() === 'POST' && route.request().headers()['next-action'])
					return route.abort();
				return route.continue();
			});
			await row
				.getByRole('button', {
					name: `Actualizar imagen Open Graph de ${name}`,
					exact: true,
				})
				.click();
			const warning = page
				.locator('[data-sonner-toast][data-type="warning"]')
				.filter({ hasText: name });
			await expect(warning).toBeVisible();
			const alert = page.getByRole('alert').filter({ hasText: name });
			await expect(alert).toContainText('puede haberse completado');
			await expect(alert).not.toContainText('automáticamente');
			await expect(alert).not.toContainText('Referencia:');
			await expect(alert.getByRole('button', { name: 'Reintentar imagen' })).toHaveCount(0);
			await page.unroute('**/dashboard/projects');
			await Promise.all([
				page.waitForEvent('load'),
				warning.getByRole('button', { name: 'Recargar página' }).click(),
			]);
			await expect(row).toBeVisible();
			await expect(page.getByRole('alert').filter({ hasText: name })).toHaveCount(0);
			await expect(page.locator('[data-sonner-toast]').filter({ hasText: name })).toHaveCount(
				0,
			);
		} finally {
			await page.unroute('**/dashboard/projects');
			await deleteOwnedRows(page, 'projects', [name]);
		}
	},
);
