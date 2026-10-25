import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { AppDocument } from '@/components/app-document';
import { getAdminCspPolicy } from '@/lib/security/csp';
import '../globals.css';

export const metadata: Metadata = {
	title: 'Portfolio CMS',
	description: 'Manage your portfolio content',
	robots: { index: false, follow: false },
};

async function NonceDocument({ children }: { children: ReactNode }) {
	const nonce = (await headers()).get('x-nonce');
	if (!nonce) throw new Error('Administrative document is missing its CSP nonce.');
	return <AppDocument nonce={nonce}>{children}</AppDocument>;
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
	const policy = getAdminCspPolicy(process.env.CSP_ADMIN_POLICY, process.env.VERCEL_ENV);
	if (policy === 'static') return <AppDocument>{children}</AppDocument>;
	// Next.js 16.2.6 explicitly permits Suspense above the root document, with an empty shell.
	// Wait for the request nonce before rendering the document and its framework scripts.
	return (
		<Suspense fallback={null}>
			<NonceDocument>{children}</NonceDocument>
		</Suspense>
	);
}
