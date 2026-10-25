# AGENTS-SEO.md

SEO and metadata guidelines for the portfolio project. Templates for metadata, Open Graph images, sitemap, and robots configuration.

> **Before implementing any SEO feature (metadata, OG images, sitemap, robots), execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/seo/SKILL.md`

---

## Production-Ready Metadata Template

Use this complete metadata template in `app/layout.tsx` (or `app/(public)/layout.tsx` for the public portfolio page). This is a Server Component export only — metadata cannot be used in Client Components.

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
	metadataBase: new URL('https://gonzalopozo.dev'),
	title: {
		default: 'Gonzalo Pozo - Full Stack Developer',
		template: '%s | Gonzalo Pozo',
	},
	description:
		'Full Stack Developer portfolio showcasing projects, work experiences, and technical skills. Built with Next.js, React, TypeScript, and Tailwind CSS.',
	keywords: [
		'full stack developer',
		'web developer',
		'portfolio',
		'react',
		'nextjs',
		'typescript',
		'tailwind css',
	],
	authors: [{ name: 'Gonzalo Pozo', url: 'https://gonzalopozo.dev' }],
	creator: 'Gonzalo Pozo',

	openGraph: {
		title: 'Gonzalo Pozo - Full Stack Developer',
		description:
			'Full Stack Developer portfolio showcasing projects, work experiences, and technical skills.',
		url: 'https://gonzalopozo.dev',
		siteName: 'Gonzalo Pozo Portfolio',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Gonzalo Pozo - Full Stack Developer Portfolio',
			},
		],
		locale: 'en_US',
		type: 'website',
	},

	twitter: {
		card: 'summary_large_image',
		title: 'Gonzalo Pozo - Full Stack Developer',
		description:
			'Full Stack Developer portfolio showcasing projects, work experiences, and technical skills.',
		creator: '@your_twitter_handle',
		images: ['/og-image.png'],
	},

	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},

	icons: {
		icon: '/icon.png',
		shortcut: '/shortcut-icon.png',
		apple: '/apple-icon.png',
	},

	verification: {
		google: 'your-google-verification-code',
	},

	alternates: {
		canonical: 'https://gonzalopozo.dev',
	},
};
```

## OG Image Generation

Create `app/(public)/opengraph-image.tsx` to auto-generate Open Graph images using `next/og`:

```typescript
import { ImageResponse } from "next/og";

export const alt = "Gonzalo Pozo - Full Stack Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: "linear-gradient(to bottom right, #0a0a0a, #1a1a2e)",
          color: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
        }}
      >
        <div style={{ fontWeight: "bold" }}>Gonzalo Pozo</div>
        <div style={{ fontSize: 32, marginTop: 16, opacity: 0.8 }}>
          Full Stack Developer
        </div>
      </div>
    ),
    { ...size }
  );
}
```

## Sitemap

Create `app/sitemap.ts`:

```typescript
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{
			url: 'https://gonzalopozo.dev',
			lastModified: new Date(),
			changeFrequency: 'weekly',
			priority: 1,
		},
	];
}
```

## Robots

Create `app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: ['/dashboard/', '/login/', '/api/'],
		},
		sitemap: 'https://gonzalopozo.dev/sitemap.xml',
	};
}
```

## Best Practices

- **Title**: Maximum 60 characters
- **Description**: 150-160 characters
- **OG Images**: 1200x630px
- **Canonical URL**: Always set `alternates.canonical`
- **metadataBase**: Set in root layout so relative URLs resolve correctly
- **Admin routes**: Disallow `/dashboard/`, `/login/`, `/api/` in robots
- **Static metadata**: Use `metadata` object for static pages
- **Dynamic metadata**: Use `generateMetadata()` only when content varies per page

## Metadata File Conventions

Place in `app/`:

| File                            | Purpose                                   |
| ------------------------------- | ----------------------------------------- |
| `favicon.ico`                   | Browser tab favicon                       |
| `icon.png` / `icon.svg`         | App icon                                  |
| `apple-icon.png`                | Apple touch icon                          |
| `opengraph-image.png` or `.tsx` | Open Graph image (1200x630px)             |
| `twitter-image.png` or `.tsx`   | Twitter card (optional, falls back to OG) |
| `sitemap.ts` / `sitemap.xml`    | Sitemap                                   |
| `robots.ts` / `robots.txt`      | Crawling directives                       |
| `manifest.ts` / `manifest.json` | PWA manifest                              |
