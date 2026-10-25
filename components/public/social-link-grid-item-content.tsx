import { safeWebUrl } from '@/lib/security/urls';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getColorVariants } from '@/lib/social-link-colors';

interface SocialLinkGridItemContentProps {
	backgroundColor: string;
	url: string;
	ariaLabel: string;
	children: ReactNode;
}

type SocialLinkGridItemStyle = CSSProperties & {
	'--social-link-bg-light-theme': string;
	'--social-link-bg-dark-theme': string;
	'--social-link-fg-light-theme': string;
	'--social-link-fg-dark-theme': string;
};

function getContrastForeground(hex: string): '#000000' | '#ffffff' {
	const channels = [1, 3, 5].map((index) => {
		const value = parseInt(hex.slice(index, index + 2), 16) / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
	return luminance > 0.179 ? '#000000' : '#ffffff';
}

export function SocialLinkGridItemContent({
	backgroundColor,
	url,
	ariaLabel,
	children,
}: SocialLinkGridItemContentProps) {
	const { lighter, darker } = getColorVariants(backgroundColor);
	const style: SocialLinkGridItemStyle = {
		'--social-link-bg-light-theme': darker,
		'--social-link-bg-dark-theme': lighter,
		'--social-link-fg-light-theme': getContrastForeground(darker),
		'--social-link-fg-dark-theme': getContrastForeground(lighter),
	};

	return (
		<div
			className="group/card relative grid size-full place-items-center bg-(--social-link-bg-light-theme) text-(--social-link-fg-light-theme) dark:bg-(--social-link-bg-dark-theme) dark:text-(--social-link-fg-dark-theme)"
			style={style}
		>
			{children}
			<a
				href={safeWebUrl(url)}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={ariaLabel}
				className="absolute inset-0 inline-flex items-center justify-center transition-[border-color,box-shadow] duration-200 ease-out focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current md:inset-auto md:bottom-4 md:left-4 md:size-9 md:rounded-full md:border md:border-current/25 md:bg-transparent md:shadow-[inset_0_0_0_0_currentColor] md:backdrop-blur-sm md:group-hover/card:border-current/50 md:hover:shadow-[inset_0_0_0_2px_currentColor] md:focus-visible:ring-2 md:focus-visible:ring-current md:focus-visible:ring-offset-2 md:focus-visible:ring-offset-(--social-link-bg-light-theme) md:focus-visible:outline-none md:dark:focus-visible:ring-offset-(--social-link-bg-dark-theme)"
			>
				<ArrowUpRight
					aria-hidden="true"
					className="hidden size-4 transition-transform duration-200 ease-out group-hover/card:scale-110 md:block"
				/>
			</a>
		</div>
	);
}
