'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

function filterPageView(event: BeforeSendEvent): BeforeSendEvent | null {
	let url: URL;
	try {
		url = new URL(event.url);
	} catch {
		return null;
	}

	// Staged candidates use the production environment before they receive the canonical domain.
	if (url.origin !== 'https://gonzalopozo.dev') return null;

	return { ...event, url: `${url.origin}${url.pathname}` };
}

export function PortfolioAnalytics() {
	return <Analytics beforeSend={filterPageView} />;
}
