import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SocialLinkGridItemContent } from '@/components/public/social-link-grid-item-content';

afterEach(cleanup);

function getThemeBackgrounds(backgroundColor: string) {
	const { container } = render(
		<SocialLinkGridItemContent
			backgroundColor={backgroundColor}
			url="https://example.com"
			ariaLabel="Visit example profile"
		>
			<span />
		</SocialLinkGridItemContent>,
	);
	const card = container.firstElementChild;

	if (!(card instanceof HTMLElement)) {
		throw new TypeError('Expected the social link card to render an HTML element.');
	}

	return {
		lighter: card.style.getPropertyValue('--social-link-bg-dark-theme'),
		darker: card.style.getPropertyValue('--social-link-bg-light-theme'),
		lightForeground: card.style.getPropertyValue('--social-link-fg-light-theme'),
		darkForeground: card.style.getPropertyValue('--social-link-fg-dark-theme'),
	};
}

describe('SocialLinkGridItemContent color variants', () => {
	it('creates the expected theme backgrounds for the social link color', () => {
		expect(getThemeBackgrounds('#66696D')).toEqual({
			lighter: '#b1b3b6',
			darker: '#1f1f21',
			lightForeground: '#ffffff',
			darkForeground: '#000000',
		});
	});

	it('preserves saturation while shifting a vivid color', () => {
		expect(getThemeBackgrounds('#ff0000')).toEqual({
			lighter: '#ff9494',
			darker: '#6b0000',
			lightForeground: '#ffffff',
			darkForeground: '#000000',
		});
	});

	it.each([
		[
			'#000000',
			{
				lighter: '#4a4a4a',
				darker: '#000000',
				lightForeground: '#ffffff',
				darkForeground: '#ffffff',
			},
		],
		[
			'#ffffff',
			{
				lighter: '#ffffff',
				darker: '#b5b5b5',
				lightForeground: '#000000',
				darkForeground: '#000000',
			},
		],
	] as const)('keeps edge color shifts within bounds for %s', (hex, expected) => {
		expect(getThemeBackgrounds(hex)).toEqual(expected);
	});
});
