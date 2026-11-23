import { cleanup, render } from '@testing-library/react';
import { Analytics } from '@vercel/analytics/next';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PublicLayout from '@/app/(public)/layout';

vi.mock('@vercel/analytics/next', () => ({
	Analytics: vi.fn(() => null),
}));

vi.mock('@/components/app-document', () => ({
	AppDocument: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

afterEach(() => {
	cleanup();
	vi.mocked(Analytics).mockClear();
	vi.unstubAllEnvs();
});

describe('public portfolio analytics', () => {
	it.each([
		{ name: 'hosted Preview', vercel: '1', environment: 'preview' },
		{ name: 'local production', vercel: undefined, environment: 'production' },
		{ name: 'the local production harness', vercel: undefined, environment: 'preview' },
		{ name: 'local development', vercel: undefined, environment: undefined },
	])('omits the collector on $name', ({ vercel, environment }) => {
		vi.stubEnv('VERCEL', vercel);
		vi.stubEnv('VERCEL_ENV', environment);

		render(<PublicLayout>Portfolio</PublicLayout>);

		expect(Analytics).not.toHaveBeenCalled();
	});

	it('sends only canonical page views and removes their query strings and fragments', () => {
		vi.stubEnv('VERCEL', '1');
		vi.stubEnv('VERCEL_ENV', 'production');

		render(<PublicLayout>Portfolio</PublicLayout>);

		const beforeSend = vi.mocked(Analytics).mock.lastCall?.[0].beforeSend;
		if (!beforeSend) throw new Error('Expected a filter on the production collector.');

		expect(
			beforeSend({
				type: 'pageview',
				url: 'https://gonzalopozo.dev/?section=Projects#portfolio-section-heading',
			}),
		).toEqual({ type: 'pageview', url: 'https://gonzalopozo.dev/' });
		expect(
			beforeSend({ type: 'pageview', url: 'https://release-candidate.vercel.app/' }),
		).toBeNull();
		expect(beforeSend({ type: 'pageview', url: 'https://www.gonzalopozo.dev/' })).toBeNull();
		expect(beforeSend({ type: 'pageview', url: 'invalid' })).toBeNull();
	});
});
