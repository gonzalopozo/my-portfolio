import { project } from '../gallery/fixture-data';
import { expect, test } from './fixtures';
import { bounds, fitsWithin } from './geometry';

test.describe.configure({ mode: 'parallel' });

test('the horizontal project stacks at a narrow container width and keeps its links usable', async ({
	mount,
	page,
}) => {
	await page.setViewportSize({ width: 1020, height: 760 });
	const story = await mount('project-horizontal');
	const card = story.locator('[data-slot="card"]');
	const media = card.locator('figure');
	const repository = card.getByRole('link', { name: 'Ver repositorio' });
	const liveProject = card.getByRole('link', { name: 'Abrir proyecto' });
	await expect(card.getByRole('heading', { name: project.title })).toBeVisible();
	await expect(media.getByText(project.title, { exact: true })).toBeVisible();
	const wideMedia = await bounds(media);
	const wideRepository = await bounds(repository);
	const wideProject = await bounds(liveProject);
	expect(wideRepository.x).toBeGreaterThan(wideMedia.x + wideMedia.width);
	expect(wideProject.y).toBeGreaterThan(wideRepository.y);

	await page.setViewportSize({ width: 930, height: 760 });
	const narrowMedia = await bounds(media);
	const narrowRepository = await bounds(repository);
	const narrowProject = await bounds(liveProject);
	expect(narrowRepository.y).toBeGreaterThan(narrowMedia.y + narrowMedia.height);
	expect(narrowProject.x).toBeGreaterThan(narrowRepository.x);
	expect(Math.abs(narrowRepository.y - narrowProject.y)).toBeLessThanOrEqual(1);
	const narrowCard = await bounds(card);
	expect(fitsWithin(narrowRepository, narrowCard)).toBe(true);
	expect(fitsWithin(narrowProject, narrowCard)).toBe(true);
	await repository.click({ trial: true });
	await liveProject.click({ trial: true });
});

test('the vertical project adjusts its typography and keeps the footer in the card', async ({
	mount,
	page,
}) => {
	await page.setViewportSize({ width: 900, height: 760 });
	const story = await mount('project-vertical');
	const card = story.locator('[data-slot="card"]');
	const heading = card.getByRole('heading', { name: project.title });
	const wideTitleSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);

	await page.setViewportSize({ width: 850, height: 760 });
	await expect(heading).not.toHaveCSS('font-size', wideTitleSize);
	const narrowTitleSize = await heading.evaluate((element) => getComputedStyle(element).fontSize);
	expect(parseFloat(narrowTitleSize)).toBeLessThan(parseFloat(wideTitleSize));
	const cardBox = await bounds(card);
	const footer = card.locator('[data-slot="card-footer"]');
	const repository = footer.getByRole('link', { name: 'Ver repositorio' });
	const liveProject = footer.getByRole('link', { name: 'Abrir proyecto' });
	const more = footer.getByRole('button', { name: 'View more' });
	for (const control of [repository, liveProject, more]) {
		expect(fitsWithin(await bounds(control), cardBox)).toBe(true);
		await control.click({ trial: true });
	}
});
