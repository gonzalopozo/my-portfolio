/** Vercel's deployment target takes precedence over local application configuration. */
function variableName(setting: 'PUBLIC_HOSTNAME' | 'READ_WRITE_TOKEN') {
	const environment = process.env.VERCEL_ENV || process.env.APP_ENV;
	return environment === 'preview' ? `BLOB_PREVIEW_${setting}` : `BLOB_${setting}`;
}

/** Keep image policy and object ownership on the selected store, without fallback. */
export function getBlobPublicHostname() {
	return process.env[variableName('PUBLIC_HOSTNAME')];
}

/** Pass the selected credential explicitly so the SDK cannot use another store's token. */
export function getBlobReadWriteToken() {
	const name = variableName('READ_WRITE_TOKEN');
	const token = process.env[name];
	if (!token) throw new Error(`${name} is required for Blob storage.`);
	return token;
}
