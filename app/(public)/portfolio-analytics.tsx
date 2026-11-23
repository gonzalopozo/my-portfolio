'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

function filterPageView(event: BeforeSendEvent): BeforeSendEvent | null {
	let url: URL;
	try {
		url = new URL(event.url);
	} catch {
		return null;
	}

	// Staged candidates also use the production environment. The bare domain redirects to www.
	if (url.origin !== 'https://www.gonzalopozo.dev') return null;

	return { ...event, url: `${url.origin}${url.pathname}` };
}

export function PortfolioAnalytics() {
	return <Analytics beforeSend={filterPageView} />;
}
