'use client';

import { useSyncExternalStore } from 'react';

function subscribe() {
	return () => {};
}

function getClientSnapshot() {
	return true;
}

function getServerSnapshot() {
	return false;
}

// Keep controls unavailable until hydration has attached their event handlers.
export function useHydrated() {
	return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
