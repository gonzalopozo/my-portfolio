import { act, cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LastTrackGridItemContent } from '@/components/public/last-track-grid-item-content';
import type { Track } from '@/lib/types';

function createTrack(): Track {
	return {
		isOnline: false,
		trackName: 'Portfolio song',
		artistName: 'Portfolio artist',
		albumName: null,
		artworkUrl: null,
		spotifyUrl: null,
		spotifyArtworkUrl: null,
		spotifyTrackId: null,
		lastFmUrl: null,
		playedAtUnix: Math.floor(Date.now() / 1000) - 59,
		playedAtLabel: 'Yesterday',
	};
}

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('music card time', () => {
	it('renders the stable provider label in HTML before hydration', () => {
		const html = renderToStaticMarkup(<LastTrackGridItemContent track={createTrack()} />);
		expect(html).toContain('Yesterday');
		expect(html).toContain('Portfolio song');
	});

	it('updates the relative label after hydration without delaying the card', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
		render(<LastTrackGridItemContent track={createTrack()} />);
		expect(screen.getByText('Portfolio song')).toBeInTheDocument();
		expect(screen.getByText('now')).toBeInTheDocument();
		act(() => vi.advanceTimersByTime(60_000));
		expect(screen.getByText('1m')).toBeInTheDocument();
	});
});
