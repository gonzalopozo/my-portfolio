import type { ReactNode } from 'react';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ThemeProvider } from '@/components/theme-provider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'], weight: '900' });

/** Shared appearance/providers; only the administrative root supplies a request nonce. */
export function AppDocument({ children, nonce }: { children: ReactNode; nonce?: string }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} font-sans antialiased`}
			>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
					<NuqsAdapter>
						<Toaster richColors position="bottom-right" />
						{children}
					</NuqsAdapter>
				</ThemeProvider>
			</body>
		</html>
	);
}
