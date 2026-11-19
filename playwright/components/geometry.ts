import { expect, type Locator } from '@playwright/test';

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

export async function bounds(locator: Locator): Promise<Box> {
	await expect(locator).toBeVisible();
	const box = await locator.boundingBox();
	if (!box) throw new Error('The visible element has no bounding box.');
	return box;
}

export function fitsWithin(inner: Box, outer: Box) {
	return (
		inner.x >= outer.x - 1 &&
		inner.y >= outer.y - 1 &&
		inner.x + inner.width <= outer.x + outer.width + 1 &&
		inner.y + inner.height <= outer.y + outer.height + 1
	);
}
