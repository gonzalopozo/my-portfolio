/** Disable unsafe links from legacy CMS records and external metadata at the rendering boundary. */
export function safeWebUrl(value: string | null | undefined): string | undefined {
	if (!value || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) return undefined;
	try {
		const url = new URL(value);
		if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
			return undefined;
		}
		return url.href;
	} catch {
		return undefined;
	}
}
