import { parseAsStringLiteral } from 'nuqs/server';

export const PORTFOLIO_SECTIONS = ['About me', 'Projects', 'Experience'] as const;
export type PortfolioSection = (typeof PORTFOLIO_SECTIONS)[number];
export const portfolioSectionParser = parseAsStringLiteral(PORTFOLIO_SECTIONS).withOptions({
	history: 'push',
	shallow: true,
	scroll: false,
});
