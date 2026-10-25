/** Explicit preview/development origins extend the fixed production origins without wildcards. */
export function getTrustedOrigins(value: string | undefined): string[] {
	const origins = ['https://www.gonzalopozo.dev', 'https://gonzalopozo.dev'];
	if (!value?.trim()) return origins;
	for (const [index, entry] of value.split(',').entries()) {
		const errorMessage =
			`Invalid BETTER_AUTH_TRUSTED_ORIGINS entry ${index + 1}. ` +
			'Use a complete HTTPS origin or a local HTTP origin, such as http://localhost:3000. ' +
			'IDs, tokens, wildcards, credentials, paths, queries, fragments, and empty entries are not allowed.';
		let url: URL;
		try {
			url = new URL(entry.trim());
		} catch {
			// Do not expose raw configuration: it may contain an accidentally pasted secret.
			throw new Error(errorMessage);
		}
		if (
			(url.protocol !== 'https:' &&
				!(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) ||
			url.username ||
			url.password ||
			url.search ||
			url.hash ||
			url.pathname !== '/' ||
			url.hostname.includes('*')
		) {
			throw new Error(errorMessage);
		}
		origins.push(url.origin);
	}
	return [...new Set(origins)];
}
