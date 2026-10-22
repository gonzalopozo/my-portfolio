export async function register() {
	if (
		process.env.NEXT_RUNTIME === 'nodejs' &&
		process.env.CI === 'true' &&
		process.env.APP_ENV === 'test' &&
		!process.env.VERCEL
	) {
		await import('./tests/fixtures/network');
	}
}
