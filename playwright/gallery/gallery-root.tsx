'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { galleryReadyEvent } from './contract';

export function GalleryRoot({ stories }: { stories: Record<string, ReactNode> }) {
	const [story, setStory] = useState<string | null>(null);

	useEffect(() => {
		window.portfolioGallery = {
			mount({ story, props }) {
				if (!Object.hasOwn(stories, story))
					throw new Error(`Unknown component story: ${story}`);
				if (props && Object.keys(props).length) {
					throw new Error('Component stories use fixed fixture props.');
				}
				flushSync(() => setStory(story));
			},
			unmount() {
				flushSync(() => setStory(null));
			},
		};
		window.dispatchEvent(new Event(galleryReadyEvent));
		return () => {
			delete window.portfolioGallery;
		};
	}, [stories]);

	return <div id="root">{story === null ? null : stories[story]}</div>;
}
