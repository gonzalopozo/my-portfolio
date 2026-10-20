import 'server-only';
import { put as sdkPut, del as sdkDelete } from '@vercel/blob';

/** Offline fixtures are available only in an explicitly isolated, non-hosted CI process. */
function isolated() {
	return (
		process.env.CI === 'true' &&
		process.env.APP_ENV === 'test' &&
		!process.env.VERCEL &&
		Boolean(process.env.TEST_FIXTURE_DIRECTORY)
	);
}

export const put: typeof sdkPut = async (pathname, body, options) => {
	if (isolated()) {
		const { putFixture } = await import('../tests/fixtures/blob');
		return putFixture(pathname, body, options);
	}
	return sdkPut(pathname, body, options);
};

export const del: typeof sdkDelete = async (url, options) => {
	if (isolated()) {
		const { deleteFixture } = await import('../tests/fixtures/blob');
		await deleteFixture(url);
		return;
	}
	return sdkDelete(url, options);
};
