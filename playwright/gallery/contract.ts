export const galleryReadyEvent = 'portfolio-gallery-ready';

interface StoryRequest {
	story: string;
	props: Record<string, unknown> | undefined;
}

interface GalleryController {
	mount: (request: StoryRequest) => void;
	unmount: () => void;
}

declare global {
	interface Window {
		portfolioGallery?: GalleryController;
		mount: (request: StoryRequest) => Promise<void>;
		unmount: () => Promise<void>;
	}
}
