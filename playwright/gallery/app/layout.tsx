import type { CSSProperties, ReactNode } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ThemeProvider } from '@/components/theme-provider';
import '@/app/globals.css';
import { GalleryRoot } from '../gallery-root';
import { stories } from '../stories';

const galleryFonts = {
	'--font-geist-sans': 'system-ui, sans-serif',
	'--font-geist-mono': 'monospace',
	'--font-fraunces': 'serif',
} as CSSProperties;

export default function GalleryLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" style={galleryFonts} suppressHydrationWarning>
			<body>
				<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
					<NuqsAdapter>
						<GalleryRoot stories={stories} />
						{children}
					</NuqsAdapter>
				</ThemeProvider>
			</body>
		</html>
	);
}
