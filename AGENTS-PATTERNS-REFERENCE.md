# AGENTS-PATTERNS-REFERENCE.md

Detailed Next.js file-system convention reference and full implementation templates extracted from [AGENTS-PATTERNS.md](./AGENTS-PATTERNS.md). Read this file when you need the full code for a specific convention or pattern — the main file has the rules and decision guidance.

> **Skill directives apply here.** Follow the skill execution instructions at the top of [AGENTS-PATTERNS.md](./AGENTS-PATTERNS.md) before writing any code based on this reference.

---

## Next.js File-System Conventions

Next.js uses a file-system based router where specific file names inside `app/` have special meaning. Reference: [Next.js File Conventions](https://nextjs.org/docs/app/api-reference/file-conventions)

---

### Page

**File**: `page.tsx` — Makes a route segment publicly accessible.

**Used in project**: Yes.

| Page                                                               | Path                                                |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| Root redirect                                                      | `app/page.tsx`                                      |
| Public portfolio                                                   | `app/(public)/page.tsx`                             |
| Login                                                              | `app/(admin)/login/page.tsx`                        |
| Dashboard overview                                                 | `app/(admin)/dashboard/page.tsx`                    |
| Projects list                                                      | `app/(admin)/dashboard/projects/page.tsx`           |
| New project                                                        | `app/(admin)/dashboard/projects/new/page.tsx`       |
| Edit project                                                       | `app/(admin)/dashboard/projects/[id]/edit/page.tsx` |
| ... (same pattern for experiences, skills, social-links, settings) |                                                     |

**Project rules**:

- Pages are async Server Components — they fetch data and render content
- After applying the Container-Presentational pattern, pages should be thin containers (~50 lines max)
- Every admin page must call `getServerSession()` at the top
- The `page.tsx` default export receives optional `params` and `searchParams` props (both are promises in Next.js 16)

```typescript
export default async function Page({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { id } = await params;
	// ...
}
```

---

### Layout

**File**: `layout.tsx` — Shared UI that wraps a route segment and its children. Persists across navigations without re-rendering.

**Used in project**: Yes.

| Layout          | Path                               | Purpose                                    |
| --------------- | ---------------------------------- | ------------------------------------------ |
| Root            | `app/layout.tsx`                   | HTML shell, fonts, global styles, metadata |
| Admin dashboard | `app/(admin)/dashboard/layout.tsx` | Sidebar, header, auth wrapper              |
| Public          | `app/(public)/layout.tsx`          | Public page shell with semantic landmarks  |

**Project rules**:

- Root layout must include `<html>` and `<body>` tags
- Layouts are Server Components by default — keep them as Server Components
- The admin dashboard layout should eventually use real session data instead of the current `mockUser`
- Layouts **cannot** access `searchParams` — only `params` and `children`
- Do **not** add `"use client"` to layouts unless absolutely necessary

```typescript
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  return <section>{children}</section>;
}
```

---

### Loading

**File**: `loading.tsx` — Instant loading UI shown while a route segment's content is being fetched. Wraps the sibling `page.tsx` in a `<Suspense>` boundary automatically.

**Used in project**: No — **needs to be added**.

See [AGENTS-PATTERNS.md § Error Boundaries](./AGENTS-PATTERNS.md#4-error-boundaries) for which route segments need `loading.tsx` files.

**Key behaviors**:

- Shown immediately on navigation — provides instant feedback before data arrives
- Server Component by default — can render Skeleton components without JS
- Shared layouts remain interactive while loading shows
- Navigation is interruptible — user can navigate away before loading completes

**Implementation**:

```typescript
// app/(admin)/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}
```

---

### Error

**File**: `error.tsx` — Fallback UI when a runtime error occurs in a route segment. Must be a Client Component (`"use client"`).

**Used in project**: No — **needs to be added**.

**Props**:

- `error: Error & { digest?: string }` — the error object. In production, server errors show a generic message; use `digest` to correlate with server logs
- `reset: () => void` — re-renders the route segment to attempt recovery

**Key behaviors**:

- Wraps `page.tsx` in a React Error Boundary
- Errors bubble up to the nearest parent `error.tsx` if not caught locally
- Does **not** catch errors in the same-level `layout.tsx` — only in `page.tsx` and children
- Root `app/error.tsx` does **not** catch root layout errors (use `global-error.tsx` for that)

**Implementation**:

```typescript
// app/(admin)/dashboard/error.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Algo salió mal</h2>
          <p className="text-muted-foreground mb-6">
            Ha ocurrido un error inesperado. Puedes intentar de nuevo o volver al inicio.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
              Ir al inicio
            </Button>
            <Button onClick={reset}>
              Intentar de nuevo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Error Logging

```typescript
// In error.tsx — log but don't display
useEffect(() => {
	console.error('Dashboard error:', error);
}, [error]);
```

---

### Global Error

**File**: `global-error.tsx` — Catches errors in the root layout itself. Must include its own `<html>` and `<body>` tags because it replaces the entire root layout.

**Used in project**: No.

**Project guidance**: Not needed unless the root layout starts performing async operations that could fail. The root layout in this project only sets up fonts and global styles, which don't throw at runtime.

```typescript
// app/global-error.tsx
"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

---

### Not Found

**File**: `not-found.tsx` — UI shown when the `notFound()` function is called within a route segment.

**Also**: `global-not-found.tsx` (experimental) — global 404 for unmatched URLs across the entire app.

**Used in project**: No — **should be added**.

**Where to add**:

| File                                  | Purpose                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `app/not-found.tsx`                   | Root-level 404 for unmatched URLs                                                                 |
| `app/(admin)/dashboard/not-found.tsx` | Shown when `notFound()` is called in dashboard pages (e.g., editing a project that doesn't exist) |

**Implementation**:

```typescript
// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h2 className="text-2xl font-bold mb-2">Página no encontrada</h2>
      <p className="text-muted-foreground mb-6">
        La página que buscas no existe.
      </p>
      <Link href="/" className="text-primary hover:underline">
        Volver al inicio
      </Link>
    </div>
  );
}
```

**Using `notFound()` in pages**:

```typescript
import { notFound } from "next/navigation";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(Number(id));

  if (!project) notFound();

  return <ProjectForm project={project} />;
}
```

**Key behaviors**:

- `not-found.tsx` is a Server Component — can fetch data
- Returns `200` status for streamed responses, `404` for non-streamed
- Root `app/not-found.tsx` handles any unmatched URL in the app

---

### Forbidden

**File**: `forbidden.tsx` — UI shown when the `forbidden()` function is called. Returns a `403` status code.

**Status**: Experimental — not recommended for production yet.

**Used in project**: No. The project uses `redirect("/login")` for unauthorized access. When `forbidden()` stabilizes, it could replace the redirect pattern for cases where the user is authenticated but lacks permissions. Requires `experimental.authInterrupts: true` in `next.config.ts`.

---

### Unauthorized

**File**: `unauthorized.tsx` — UI shown when the `unauthorized()` function is called. Returns a `401` status code.

**Status**: Experimental — not recommended for production yet.

**Used in project**: No. Same as `forbidden.tsx`. When stable, `unauthorized()` could replace `redirect("/login")` to show a login form in-place. Requires `experimental.authInterrupts: true` in `next.config.ts`.

---

### Route Handler

**File**: `route.ts` — Custom request handlers using the Web Request/Response APIs.

**Used in project**: Yes.

| Route Handler         | Path                                          | Purpose                                |
| --------------------- | --------------------------------------------- | -------------------------------------- |
| Auth catch-all        | `app/api/auth/[...all]/route.ts`              | better-auth handles all auth endpoints |
| Clear invalid session | `app/api/auth/clear-invalid-session/route.ts` | Clears stale session cookies           |

**Project rules**:

- Prefer Server Actions over Route Handlers for data mutations — Route Handlers are only needed for third-party integrations (like better-auth)
- Route Handlers support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
- `params` is a promise in Next.js 16 — must be awaited
- A `route.ts` in the same segment as `page.tsx` will conflict

```typescript
// app/api/example/route.ts
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	return Response.json({ data: 'example' });
}
```

---

### Proxy

**File**: `proxy.ts` — Runs on every matching request before the route is rendered. Used for redirects, rewrites, header modifications, and CSP nonce generation.

**Used in project**: Yes — root `proxy.ts` handles optimistic auth redirects and administrative CSP; `next.config.ts` owns the static public CSP. Administrative nonces are supported in Preview and Production after protected Preview validation; see the rollout status in `AGENTS-SECURITY-REFERENCE.md`.

**Documented in**: `AGENTS-SECURITY.md` > Content Security Policy, Auth Protection Pattern.

**Key behaviors**:

- Uses the Next.js 16 Node.js proxy runtime, before rendering
- Can rewrite, redirect, or produce responses
- Cannot access the request body
- Keep logic fast — avoid heavy DB calls

---

### Template

**File**: `template.tsx` — Like a layout, but **remounts on every navigation** (gives children a unique key). DOM is recreated, effects re-run, state resets.

**Used in project**: No.

**When to use (not currently needed)**:

- To reset form state between navigations
- To re-trigger `useEffect` on every navigation
- To show a Suspense fallback on every navigation (layouts only show it on first load)

| Behavior                    | `layout.tsx`    | `template.tsx`    |
| --------------------------- | --------------- | ----------------- |
| Persists across navigations | Yes             | No                |
| Preserves state             | Yes             | No — state resets |
| Re-runs `useEffect`         | No              | Yes               |
| Suspense fallback           | First load only | Every navigation  |

**Nesting order**: `layout.tsx` → `template.tsx` → `page.tsx`

---

### Default

**File**: `default.tsx` — Fallback for Parallel Route slots when Next.js can't recover the active state after a full-page load (hard navigation).

**Used in project**: No — the project does not use Parallel Routes.

**When needed**: Only required when using `@slot` Parallel Routes.

---

### Route Groups

**Convention**: `(folder)` — Organize routes without affecting the URL path.

**Used in project**: Yes.

| Route Group | Path            | Purpose                                                        |
| ----------- | --------------- | -------------------------------------------------------------- |
| `(admin)`   | `app/(admin)/`  | Groups login and dashboard routes under a shared admin context |
| `(public)`  | `app/(public)/` | Groups the public portfolio page with its own layout           |

**Project rules**:

- Route group names are stripped from the URL — `app/(admin)/dashboard/` maps to `/dashboard`
- Each route group can have its own `layout.tsx`, `error.tsx`, `loading.tsx`, `not-found.tsx`
- Never nest route groups unnecessarily — keep the hierarchy flat

---

### Dynamic Segments

**Convention**: `[param]` for single, `[...param]` for catch-all, `[[...param]]` for optional catch-all.

**Used in project**: Yes.

| Segment    | Path                                            | Purpose                             |
| ---------- | ----------------------------------------------- | ----------------------------------- |
| `[id]`     | `app/(admin)/dashboard/projects/[id]/edit/`     | Edit a specific project by ID       |
| `[id]`     | `app/(admin)/dashboard/experiences/[id]/edit/`  | Edit a specific experience by ID    |
| `[id]`     | `app/(admin)/dashboard/skills/[id]/edit/`       | Edit a specific skill by ID         |
| `[id]`     | `app/(admin)/dashboard/social-links/[id]/edit/` | Edit a specific social link by ID   |
| `[...all]` | `app/api/auth/[...all]/`                        | Catch-all for better-auth endpoints |

**Project rules**:

- `params` is a **promise** in Next.js 16 — always `await params` before accessing properties
- Validate `id` params before using them — parse as `Number(id)` and call `notFound()` if the entity doesn't exist

```typescript
const { id } = await params;
const numericId = Number(id);
if (isNaN(numericId)) notFound();
```

---

### Parallel Routes

**Convention**: `@folder` — Render multiple pages in the same layout simultaneously.

**Used in project**: No. This project's dashboard pages are sequential, not parallel.

---

### Intercepting Routes

**Convention**: `(.)folder`, `(..)folder`, `(..)(..)folder`, `(...)folder` — Intercept a route and render it in the current layout.

**Used in project**: No. Could be useful if the project adds "quick edit" modals.

---

### Route Segment Config

**Convention**: Named exports that configure rendering behavior.

| Export            | Type                                                     | Default          | Purpose                                              |
| ----------------- | -------------------------------------------------------- | ---------------- | ---------------------------------------------------- |
| `dynamic`         | `'auto' \| 'force-dynamic' \| 'error' \| 'force-static'` | `'auto'`         | Control static vs dynamic rendering                  |
| `dynamicParams`   | `boolean`                                                | `true`           | Allow dynamic segments not in `generateStaticParams` |
| `revalidate`      | `false \| 0 \| number`                                   | `false`          | Default revalidation time (seconds)                  |
| `fetchCache`      | `'auto' \| 'force-cache' \| ...`                         | `'auto'`         | Override fetch cache behavior                        |
| `runtime`         | `'nodejs' \| 'edge'`                                     | `'nodejs'`       | Execution runtime                                    |
| `preferredRegion` | `'auto' \| 'global' \| 'home' \| string[]`               | `'auto'`         | Deployment region preference                         |
| `maxDuration`     | `number`                                                 | Platform default | Maximum execution time (seconds)                     |

**Important**: These options are disabled when `cacheComponents: true` is set in `next.config.ts` (which this project uses). Prefer the Data Access Facade with `"use cache"` and `cacheLife()` instead.

---

### Instrumentation

**File**: `instrumentation.ts` — Runs once when a new Next.js server instance starts.

**Used in project**: Yes — registers guarded network fixtures for isolated CI production tests.

**Rule**: Fixture activation requires the Node.js runtime, `CI=true`, `APP_ENV=test`, and no Vercel runtime.

```typescript
// instrumentation.ts
export async function register() {
	if (
		process.env.NEXT_RUNTIME === 'nodejs' &&
		process.env.CI === 'true' &&
		process.env.APP_ENV === 'test' &&
		!process.env.VERCEL
	) {
		await import('./tests/fixtures/network');
	}
}
```

---

### Instrumentation Client

**File**: `instrumentation-client.ts` — Runs on the client before React hydration. Used for client-side monitoring, analytics, polyfills.

**Used in project**: No.

**When to add**: When the project needs client-side analytics or error monitoring.

```typescript
// instrumentation-client.ts
export function onRouterTransitionStart(
	url: string,
	navigationType: 'push' | 'replace' | 'traverse',
) {
	// Track navigation event
}
```

---

### MDX Components

**File**: `mdx-components.tsx` — Required when using `@next/mdx`.

**Used in project**: No — the project does not use MDX content.

---

### Public Folder

**Directory**: `public/` — Static files served at the root URL.

**Used in project**: Yes.

**Project rules**:

- Reference files as `/filename.ext` (not `/public/filename.ext`)
- Only put truly static assets here
- Metadata files should use the metadata file conventions in `app/` when possible

---

### Src Folder

**Directory**: `src/` — Alternative to placing `app/` at the root.

**Used in project**: No — the project uses root-level `app/`. Do not adopt.

---

### Metadata Files

Metadata files generate SEO tags, favicons, sitemaps, and social sharing images. **Full templates in [AGENTS-SEO.md](./AGENTS-SEO.md).**

| File                            | Purpose                                   | Status     |
| ------------------------------- | ----------------------------------------- | ---------- |
| `favicon.ico`                   | Browser tab favicon                       | **Needed** |
| `icon.png` / `icon.svg`         | App icon                                  | **Needed** |
| `apple-icon.png`                | Apple touch icon                          | **Needed** |
| `opengraph-image.tsx` or `.png` | Social sharing image (1200x630px)         | **Needed** |
| `twitter-image.tsx` or `.png`   | Twitter card (optional, falls back to OG) | Optional   |
| `sitemap.ts` / `sitemap.xml`    | Sitemap                                   | **Needed** |
| `robots.ts` / `robots.txt`      | Crawling directives                       | **Needed** |
| `manifest.ts` / `manifest.json` | Web app manifest (PWA)                    | Optional   |

**Project rules**:

- Prefer `.ts`/`.tsx` over static files — type-safe, dynamic content
- `opengraph-image.tsx` uses `next/og` (`ImageResponse`) at build time
- `sitemap.ts` should disallow `/dashboard/`, `/login/`, `/api/`
- See [AGENTS-SEO.md](./AGENTS-SEO.md) for complete implementation templates

---

### Convention Nesting Order

When multiple conventions exist in the same route segment, Next.js renders them in this order:

```
layout.tsx
├── template.tsx
│   ├── error.tsx (wraps in Error Boundary)
│   │   ├── loading.tsx (wraps in Suspense)
│   │   │   ├── not-found.tsx (shown on notFound() call)
│   │   │   └── page.tsx
│   │   └── (children route segments)
│   └── (error fallback UI)
└── (persists across navigations)
```

This means:

- `error.tsx` catches errors from `page.tsx` and `loading.tsx`, but **not** from `layout.tsx` or `template.tsx`
- `loading.tsx` shows while `page.tsx` is streaming/suspending
- `template.tsx` re-renders on navigation; `layout.tsx` does not

---

## Full Pattern Implementation Templates

### Container-Presentational — Presentational Component

```typescript
// components/admin/projects-table.tsx
"use client";

import type { ProjectInfo } from "@/lib/types";
import { deleteProject } from "@/lib/actions/projects";

interface ProjectsTableProps {
  projects: ProjectInfo[];
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
  if (projects.length === 0) {
    return <EntityEmptyState /* ... */ />;
  }

  return (
    <Card>
      {/* Table rendering, formatting, action buttons */}
    </Card>
  );
}
```

### Data Access Facade — Full Query Example

```typescript
// lib/queries/projects.ts
import 'server-only';
import { db } from '@/db';
import { projects } from '@/db/schema/portfolio';
import { asc, eq } from 'drizzle-orm';

export async function getProjectsWithSkills() {
	return db.query.projects.findMany({
		with: {
			projectSkills: {
				columns: {},
				with: {
					skill: {
						columns: { id: true, name: true },
					},
				},
			},
		},
		orderBy: [asc(projects.order)],
	});
}

export async function getProjectById(id: number) {
	return db.query.projects.findFirst({
		where: eq(projects.id, id),
		with: {
			projectSkills: {
				columns: {},
				with: {
					skill: true,
				},
			},
		},
	});
}
```

### Data Access Facade — Adding Caching

```typescript
// lib/queries/projects.ts
import 'server-only';
import { unstable_cacheLife as cacheLife } from 'next/cache';

export async function getProjectsWithSkills() {
	'use cache';
	cacheLife('minutes');

	return db.query.projects.findMany({
		/* ... */
	});
}
```

### Zod Schema Example

```typescript
// lib/schemas/projects.ts
import { z } from 'zod';

export const projectSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().min(1, 'Description is required').max(2000),
	url: z.string().url('Invalid URL').optional().or(z.literal('')),
	repoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
	status: z.enum(['active', 'archived', 'in-progress']),
	skillIds: z.array(z.number().int().positive()).default([]),
});
```
