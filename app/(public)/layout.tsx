import Link from 'next/link';
import type { Metadata } from 'next';
import { AppDocument } from '@/components/app-document';
import { WebVitals } from '@/components/web-vitals';
import '../globals.css';

export const metadata: Metadata = {
	title: 'Gonzalo Pozo - Full Stack Developer',
	description: 'Portfolio of Gonzalo Pozo, a full stack developer.',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
	return (
		<AppDocument>
			<WebVitals />
			<div className="bg-background">
				<Link
					href="#portfolio-section-heading"
					className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-60 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:text-primary-foreground focus:outline-2 focus:outline-offset-2 focus:outline-ring"
				>
					Skip to portfolio
				</Link>
				<main id="main-content" tabIndex={-1}>
					<h1 className="sr-only">Gonzalo Pozo — Full Stack Developer</h1>
					{children}
				</main>
			</div>
		</AppDocument>
	);
}
