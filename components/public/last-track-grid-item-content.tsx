'use client';

import { useSyncExternalStore } from 'react';
import { safeWebUrl } from '@/lib/security/urls';
import Image from 'next/image';
import { Clock, Music } from 'lucide-react';
import type { Track } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LastTrackGridItemContentProps {
	track: Track | null;
	isDesktop?: boolean;
}

interface TrackArtworkProps {
	isDesktop: boolean;
	isOnline: boolean;
	trackName: string;
	safeArtist: string;
	artworkUrl: string | null;
	playedAtUnix: number | null;
	playedAtLabel: string | null;
	source: 'spotify' | 'last.fm';
	spotifyUrl: string | null;
	spotifyLinkLabel: string;
}

interface SpotifyTextLinkProps {
	url: string | null;
	onArtwork: boolean;
	ariaLabel: string;
	children: string;
}

export function LastTrackGridItemContent({
	track,
	isDesktop = false,
}: LastTrackGridItemContentProps) {
	if (!track) {
		return <MusicEmptyState />;
	}

	const { isOnline, trackName, artistName, artworkUrl, spotifyUrl, playedAtUnix, playedAtLabel } =
		track;
	const safeArtist = artistName?.trim() ? artistName : 'Unknown artist';
	const sourceUrl = spotifyUrl;
	const ariaLabel = `${isOnline ? 'Now playing' : 'Last scrobbled'}: ${trackName} by ${safeArtist}${
		sourceUrl && !isDesktop ? `. Opens Spotify.` : ''
	}`;
	const spotifyLinkLabel = `Open ${trackName} by ${safeArtist} on Spotify (opens in a new tab)`;

	const inner = (
		<TrackArtwork
			isDesktop={isDesktop}
			isOnline={isOnline}
			trackName={trackName}
			safeArtist={safeArtist}
			artworkUrl={artworkUrl}
			playedAtUnix={playedAtUnix}
			playedAtLabel={playedAtLabel}
			source={sourceUrl ? 'spotify' : 'last.fm'}
			spotifyUrl={isDesktop ? sourceUrl : null}
			spotifyLinkLabel={spotifyLinkLabel}
		/>
	);

	const baseClassName =
		'relative block size-full overflow-hidden focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none';

	if (sourceUrl && !isDesktop) {
		return (
			<a
				href={safeWebUrl(sourceUrl)}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={ariaLabel}
				className={baseClassName}
			>
				{inner}
			</a>
		);
	}

	return (
		<div className={cn(baseClassName, isDesktop && 'select-none')} aria-label={ariaLabel}>
			{inner}
		</div>
	);
}

function TrackArtwork({
	isDesktop,
	isOnline,
	trackName,
	safeArtist,
	artworkUrl,
	playedAtUnix,
	playedAtLabel,
	source,
	spotifyUrl,
	spotifyLinkLabel,
}: TrackArtworkProps) {
	const hasArtwork = Boolean(artworkUrl);

	return (
		<>
			{hasArtwork ? (
				<div
					className={cn(
						'absolute inset-0',
						isOnline &&
							`motion-safe:animate-now-playing-cover motion-reduce:scale-[1.015]`,
					)}
				>
					<Image
						src={artworkUrl!}
						alt=""
						fill
						draggable={isDesktop ? false : undefined}
						sizes="(min-width: 996px) 25vw, (min-width: 768px) 50vw, 50vw"
						className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:group-hover/music:scale-[1.02] motion-reduce:transition-none"
						aria-hidden="true"
					/>
				</div>
			) : (
				<div
					className={cn(
						'absolute inset-0 bg-linear-to-br from-primary/25 via-card to-card',
						isOnline &&
							`from-primary/35 via-secondary motion-safe:animate-now-playing-cover`,
					)}
				>
					<div className="absolute inset-0 grid place-items-center">
						<Music className="size-10 text-primary/40" aria-hidden="true" />
					</div>
				</div>
			)}

			{isOnline && <NowPlayingAtmosphere onArtwork={hasArtwork} />}

			{hasArtwork && (
				<>
					<div
						className={cn(
							'pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b to-transparent',
							spotifyUrl
								? 'h-24 from-media-background/95 via-media-background/85'
								: 'h-20 from-black/55',
						)}
					/>
					<div
						className={cn(
							'pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t to-transparent',
							spotifyUrl
								? 'from-media-background/95 via-media-background/80'
								: 'from-black/85 via-black/45 transition-[background-image] duration-300 motion-safe:group-hover/music:from-black/90',
						)}
					/>
				</>
			)}

			<SourceLabel
				source={source}
				onArtwork={hasArtwork}
				spotifyUrl={spotifyUrl}
				spotifyLinkLabel={spotifyLinkLabel}
			/>
			<ActivityBadge
				isOnline={isOnline}
				playedAtUnix={playedAtUnix}
				playedAtLabel={playedAtLabel}
				onArtwork={hasArtwork}
			/>

			<TrackText
				trackName={trackName}
				safeArtist={safeArtist}
				onArtwork={hasArtwork}
				spotifyUrl={spotifyUrl}
				spotifyLinkLabel={spotifyLinkLabel}
				className="absolute inset-x-3 bottom-3 z-10"
			/>
		</>
	);
}

function SpotifyTextLink({ url, onArtwork, ariaLabel, children }: SpotifyTextLinkProps) {
	if (!url) return <>{children}</>;

	return (
		<a
			href={safeWebUrl(url)}
			target="_blank"
			rel="noopener noreferrer"
			draggable={false}
			aria-label={ariaLabel}
			className={cn(
				'cursor-pointer rounded-xs underline decoration-current/40 decoration-1 underline-offset-[3px]',
				'group-hover/grid-item:decoration-current/85',
				'transition-[color,text-decoration-color,text-decoration-thickness] duration-320 ease-in-out motion-reduce:transition-none',
				'hover:decoration-2 focus-visible:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current',
				onArtwork
					? 'text-media-foreground hover:decoration-media-primary group-hover/grid-item:hover:decoration-media-primary focus-visible:decoration-media-primary group-hover/grid-item:focus-visible:decoration-media-primary'
					: 'hover:text-foreground hover:decoration-primary group-hover/grid-item:hover:decoration-primary focus-visible:text-foreground focus-visible:decoration-primary group-hover/grid-item:focus-visible:decoration-primary',
			)}
		>
			{children}
		</a>
	);
}

function SourceLabel({
	source,
	onArtwork,
	spotifyUrl,
	spotifyLinkLabel,
}: {
	source: 'spotify' | 'last.fm';
	onArtwork: boolean;
	spotifyUrl: string | null;
	spotifyLinkLabel: string;
}) {
	return (
		<span
			className={cn(
				`absolute top-3 left-3 z-10 hidden font-mono text-[10px] tracking-wide transition-colors md:inline`,
				onArtwork ? `text-media-foreground` : 'text-muted-foreground',
				spotifyUrl && 'leading-5',
				spotifyUrl &&
					'transition-transform duration-400 ease-in-out motion-safe:group-hover/grid-item:-translate-y-px motion-reduce:transition-none',
			)}
			aria-hidden={spotifyUrl ? undefined : true}
		>
			<SpotifyTextLink url={spotifyUrl} onArtwork={onArtwork} ariaLabel={spotifyLinkLabel}>
				{source}
			</SpotifyTextLink>
		</span>
	);
}

function ActivityBadge({
	isOnline,
	playedAtUnix,
	playedAtLabel,
	onArtwork,
}: {
	isOnline: boolean;
	playedAtUnix: number | null;
	playedAtLabel: string | null;
	onArtwork: boolean;
}) {
	const relativeTime = useSyncExternalStore(
		subscribeRelativeTime,
		() => formatRelative(playedAtUnix, playedAtLabel),
		() => playedAtLabel ?? '—',
	);

	return (
		<span
			className={cn(
				`absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium tracking-wide uppercase backdrop-blur-md transition-colors`,
				isOnline
					? onArtwork
						? 'border-media-primary/30 bg-media-background/80 text-media-foreground shadow-lg shadow-media-primary/20'
						: `border-primary/30 bg-primary/10 text-foreground shadow-lg shadow-primary/15`
					: onArtwork
						? 'border-white/10 bg-media-background/80 text-media-foreground'
						: 'border-foreground/10 bg-foreground/10 text-foreground',
			)}
		>
			{isOnline ? (
				<>
					<NowPlayingEqualiser onArtwork={onArtwork} />
					<span className="hidden md:inline">Now Playing</span>
					<span className="sr-only">Currently playing</span>
				</>
			) : (
				<>
					<Clock className="size-3" aria-hidden="true" />
					<span>{relativeTime}</span>
				</>
			)}
		</span>
	);
}

function TrackText({
	trackName,
	safeArtist,
	onArtwork,
	spotifyUrl,
	spotifyLinkLabel,
	className,
}: {
	trackName: string;
	safeArtist: string;
	onArtwork: boolean;
	spotifyUrl: string | null;
	spotifyLinkLabel: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex min-w-0 flex-col gap-0.5',
				spotifyUrl &&
					'transition-transform duration-400 ease-in-out motion-safe:group-hover/grid-item:-translate-y-px motion-reduce:transition-none',
				className,
			)}
		>
			<p
				className={cn(
					'line-clamp-2 text-sm/tight font-semibold',
					onArtwork ? 'text-media-foreground' : 'text-foreground',
					spotifyUrl && 'leading-normal',
					onArtwork &&
						'max-md:w-fit max-md:max-w-full max-md:rounded-md max-md:bg-media-background/80 max-md:px-1 max-md:py-0.5',
				)}
			>
				<SpotifyTextLink
					url={spotifyUrl}
					onArtwork={onArtwork}
					ariaLabel={spotifyLinkLabel}
				>
					{trackName}
				</SpotifyTextLink>
			</p>
			<p
				className={cn(
					'line-clamp-1 text-xs/tight',
					onArtwork ? 'text-media-foreground' : 'text-muted-foreground',
					spotifyUrl && 'leading-normal',
					onArtwork &&
						'max-md:w-fit max-md:max-w-full max-md:rounded-md max-md:bg-media-background/80 max-md:px-1 max-md:py-0.5',
				)}
			>
				<SpotifyTextLink
					url={spotifyUrl}
					onArtwork={onArtwork}
					ariaLabel={spotifyLinkLabel}
				>
					{safeArtist}
				</SpotifyTextLink>
			</p>
		</div>
	);
}

function NowPlayingAtmosphere({ onArtwork }: { onArtwork: boolean }) {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
			<span
				className={cn(
					`absolute -top-12 -right-10 size-32 rounded-full blur-2xl motion-safe:animate-now-playing-glow motion-reduce:opacity-40`,
					onArtwork ? 'bg-media-primary/45' : 'bg-primary/25',
				)}
			/>
			<span
				className={cn(
					`absolute top-8 -left-20 h-14 w-[150%] rotate-[-14deg] motion-safe:animate-now-playing-sweep motion-reduce:hidden`,
					onArtwork ? 'bg-white/20' : 'bg-primary/10',
				)}
			/>
		</div>
	);
}

function NowPlayingEqualiser({ onArtwork }: { onArtwork: boolean }) {
	const barClass = cn(
		`block h-full w-0.5 origin-bottom rounded-full bg-current motion-reduce:scale-y-[0.65]`,
	);
	return (
		<span
			className={cn(
				'relative flex h-3.5 items-end gap-0.5',
				onArtwork ? 'text-media-primary' : 'text-primary',
			)}
			aria-hidden="true"
		>
			<span className="absolute -inset-1 rounded-full bg-current opacity-20 blur-sm motion-safe:animate-now-playing-glow motion-reduce:opacity-20" />
			<span className={cn(barClass, 'motion-safe:animate-eq-bar-1')} />
			<span className={cn(barClass, 'motion-safe:animate-eq-bar-2')} />
			<span className={cn(barClass, 'motion-safe:animate-eq-bar-3')} />
			<span className={cn(barClass, 'motion-safe:animate-eq-bar-4')} />
		</span>
	);
}

function subscribeRelativeTime(onChange: () => void) {
	const interval = setInterval(onChange, 60_000);
	return () => clearInterval(interval);
}

function formatRelative(unix: number | null, fallback: string | null): string {
	if (unix === null || unix === undefined) return fallback ?? '—';
	const ts = Number(unix);
	if (!Number.isFinite(ts)) return fallback ?? '—';
	const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts);
	if (diff < 60) return 'now';
	if (diff < 3600) return `${Math.floor(diff / 60)}m`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
	if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
	return (
		fallback ??
		new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
	);
}

function MusicEmptyState() {
	return (
		<div className="relative size-full overflow-hidden">
			<div className="absolute inset-0 bg-linear-to-br from-primary/20 via-card to-card" />
			<div className="absolute inset-0 grid place-items-center">
				<Music className="size-10 text-primary/40" aria-hidden="true" />
			</div>
			<span
				className="absolute top-3 left-3 font-mono text-[10px] tracking-wide text-muted-foreground"
				aria-hidden="true"
			>
				last.fm
			</span>
			<div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-0.5">
				<p className="text-sm/tight font-semibold text-foreground">Not scrobbling</p>
				<p className="text-xs text-muted-foreground">No recent activity</p>
			</div>
		</div>
	);
}
