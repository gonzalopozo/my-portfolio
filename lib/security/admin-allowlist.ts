/** Parse stable better-auth IDs without granting access on malformed configuration. */
export function parseAdminUserIds(value: string | undefined): ReadonlySet<string> {
	if (!value?.trim()) return new Set();
	const entries = value.split(',').map((id) => id.trim());
	if (entries.some((id) => !/^[a-zA-Z0-9_-]{1,128}$/.test(id))) return new Set();
	return new Set(entries);
}
