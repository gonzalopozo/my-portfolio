'use client';

import { createContext, Suspense, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryState } from 'nuqs';
import {
	portfolioSectionParser,
	type PortfolioSection,
} from '@/components/public/portfolio-sections';

interface SectionRequest {
	section: PortfolioSection | null;
	version: number;
}

interface PortfolioSectionState {
	section: PortfolioSection | null;
	setSection: (section: PortfolioSection | null) => void;
}

const PortfolioSectionContext = createContext<PortfolioSectionState | null>(null);

/** Only this bridge reads request search params; the visible grid stays prerenderable. */
function PortfolioSectionUrlSync({
	request,
	onUrlChange,
}: {
	request: SectionRequest | null;
	onUrlChange: (section: PortfolioSection | null) => void;
}) {
	const [section, setSection] = useQueryState('section', portfolioSectionParser);
	const handledVersion = useRef(0);

	useEffect(() => {
		if (request && request.version !== handledVersion.current) {
			handledVersion.current = request.version;
			void setSection(request.section);
		} else {
			onUrlChange(section);
		}
	}, [request, section, setSection, onUrlChange]);

	return null;
}

export function PortfolioSectionProvider({ children }: { children: ReactNode }) {
	const [section, setSection] = useState<PortfolioSection | null>(null);
	const [request, setRequest] = useState<SectionRequest | null>(null);

	function selectSection(nextSection: PortfolioSection | null) {
		setSection(nextSection);
		setRequest((previous) => ({ section: nextSection, version: (previous?.version ?? 0) + 1 }));
	}

	return (
		<PortfolioSectionContext value={{ section, setSection: selectSection }}>
			<Suspense fallback={null}>
				<PortfolioSectionUrlSync request={request} onUrlChange={setSection} />
			</Suspense>
			{children}
		</PortfolioSectionContext>
	);
}

export function usePortfolioSection() {
	const state = use(PortfolioSectionContext);
	if (!state) throw new Error('Portfolio section controls require PortfolioSectionProvider.');
	return state;
}
