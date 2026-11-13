import type { ReactNode } from 'react';
import { renderToReadableStream, renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ policy: 'static' as 'static' | 'nonce' }));
vi.mock('next/font/google', () => ({
	Fraunces: () => ({ variable: 'font-fraunces' }),
	Geist: () => ({ variable: 'font-geist' }),
	Geist_Mono: () => ({ variable: 'font-geist-mono' }),
}));
vi.mock('next/headers', () => ({
	headers: async () => new Headers({ 'x-nonce': 'synthetic-admin-nonce' }),
}));
vi.mock('@/lib/security/csp', () => ({ getAdminCspPolicy: () => config.policy }));
vi.mock('@/components/theme-provider', () => ({
	ThemeProvider: ({ children, nonce }: { children: ReactNode; nonce?: string }) => (
		<div data-theme-nonce={nonce}>{children}</div>
	),
}));
vi.mock('nuqs/adapters/next/app', () => ({
	NuqsAdapter: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('sonner', () => ({
	Toaster: ({ theme, position }: { theme: string; position: string }) => (
		<div data-sonner-toaster="" data-theme={theme} data-position={position} />
	),
}));

import { AppDocument } from '@/components/app-document';
import AdminRootLayout from '@/app/(admin)/layout';
import PublicLayout from '@/app/(public)/layout';

beforeEach(() => {
	config.policy = 'static';
});

describe('admin-only toast host', () => {
	it('keeps the shared document and public portfolio free of a toast host', () => {
		expect(renderToStaticMarkup(<AppDocument>Shared content</AppDocument>)).not.toContain(
			'data-sonner-toaster',
		);
		expect(renderToStaticMarkup(<PublicLayout>Public portfolio</PublicLayout>)).not.toContain(
			'data-sonner-toaster',
		);
	});
	it.each(['Login', 'Dashboard'])(
		'provides one themed host for the administrative %s page',
		(page) => {
			const html = renderToStaticMarkup(<AdminRootLayout>{page}</AdminRootLayout>);
			expect(html.match(/data-sonner-toaster/g)).toHaveLength(1);
			expect(html).toContain('data-theme="dark"');
			expect(html).toContain('data-position="bottom-right"');
			expect(html).toContain(page);
		},
	);
	it('preserves the nonce document branch and its administrative toast host', async () => {
		config.policy = 'nonce';
		const stream = await renderToReadableStream(<AdminRootLayout>Dashboard</AdminRootLayout>);
		await stream.allReady;
		const html = await new Response(stream).text();
		expect(html.match(/data-sonner-toaster/g)).toHaveLength(1);
		expect(html).toContain('data-theme-nonce="synthetic-admin-nonce"');
	});
});
