const projectImagePath =
	/^\/og-images\/([0-9]+)-[0-9]+(?:-[A-Za-z0-9]+)?\.(?:png|jpg|jpeg|webp|gif|avif)$/;

/** A deletion is restricted to an exact configured store and a project-owned managed path. */
export function isProjectImageUrl(
	value: string,
	projectId: number | undefined,
	origin: string | undefined,
) {
	if (!projectId || !Number.isSafeInteger(projectId) || projectId < 1 || !origin) return false;
	try {
		const configured = new URL(origin);
		const url = new URL(value);
		const imagePath = projectImagePath.exec(url.pathname);
		return (
			configured.protocol === 'https:' &&
			configured.hostname.endsWith('.public.blob.vercel-storage.com') &&
			configured.pathname === '/' &&
			!configured.username &&
			!configured.password &&
			!configured.search &&
			!configured.hash &&
			url.origin === configured.origin &&
			!url.username &&
			!url.password &&
			!url.search &&
			!url.hash &&
			imagePath?.[1] === String(projectId)
		);
	} catch {
		return false;
	}
}
