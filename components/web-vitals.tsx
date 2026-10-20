'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { metrics } from '@sentry/nextjs';
import { routeName } from '@/lib/observability/privacy';

const report: Parameters<typeof useReportWebVitals>[0] = (metric) => {
	if (!['LCP', 'INP', 'CLS'].includes(metric.name) || !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
	metrics.distribution(`web_vitals.${metric.name.toLowerCase()}`, metric.value, {
		unit: metric.name === 'CLS' ? 'none' : 'millisecond',
		attributes: {
			route: routeName(location.pathname),
			rating: metric.rating,
			release: process.env.NEXT_PUBLIC_RELEASE_SHA ?? 'local',
		},
	});
};

export function WebVitals() {
	useReportWebVitals(report);
	return null;
}
