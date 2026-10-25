'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(width < 768px)';
const DRAG_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

function subscribeMobile(onChange: () => void) {
	const query = window.matchMedia(MOBILE_QUERY);
	query.addEventListener('change', onChange);
	return () => query.removeEventListener('change', onChange);
}

function subscribeDragPointer(onChange: () => void) {
	const query = window.matchMedia(DRAG_POINTER_QUERY);
	query.addEventListener('change', onChange);
	return () => query.removeEventListener('change', onChange);
}

function getMobileSnapshot() {
	return window.matchMedia(MOBILE_QUERY).matches;
}

function getDragPointerSnapshot() {
	return window.matchMedia(DRAG_POINTER_QUERY).matches;
}

function getServerSnapshot() {
	return false;
}

/** Share the CSS mobile boundary and enable dragging only for a mouse-like pointer. */
export function usePortfolioMedia() {
	const isMobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerSnapshot);
	const hasDragPointer = useSyncExternalStore(
		subscribeDragPointer,
		getDragPointerSnapshot,
		getServerSnapshot,
	);
	return { isMobile, hasDragPointer };
}
