# AGENTS-PATTERNS.md

Design patterns and architecture guidelines for the portfolio project.

> **Before refactoring component architecture or splitting components, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/vercel-composition-patterns/SKILL.md`

> **Before implementing Next.js file-system conventions or App Router patterns, execute the following skills** — read each SKILL.md and follow its instructions:
>
> 1. `.claude/skills/next-best-practices/SKILL.md`
> 2. `.claude/skills/nextjs-app-router-patterns/SKILL.md`

> **Before optimizing Server Actions or React performance, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/vercel-react-best-practices/SKILL.md`

**Related coverage in other AGENTS files (do not duplicate):**

- `AGENTS-SECURITY.md` — Server Action auth/validation rules, public static CSP and administrative nonces in Preview/Production
- `AGENTS-TESTING.md` — TDD for Zod schemas, Server Action test patterns
- `AGENTS-PERFORMANCE.md` — Server vs Client decision tree, loading/streaming
- `AGENTS-ACCESSIBILITY.md` — Semantic layout landmarks, heading hierarchy
- [AGENTS-SEO.md](./AGENTS-SEO.md) — Metadata templates, OG images, sitemap, robots

---

## Overview

| Pattern                  | What It Solves                                            | Where It Applies                   |
| ------------------------ | --------------------------------------------------------- | ---------------------------------- |
| Container-Presentational | Page files mix data fetching with 200+ lines of UI        | Admin dashboard pages, public page |
| Server Action Hardening  | Actions have no auth, no validation, no error handling    | All `lib/actions/` files           |
| Data Access Facade       | DB queries duplicated inline across page files            | All pages that query the database  |
| Error Boundaries         | Zero error recovery — failed DB query crashes entire page | All route segments                 |

---

## 1. Container-Presentational Pattern

Split each page into a **Container** (the `page.tsx` — fetches data, checks auth, passes props) and a **Presentational** component (receives data via props, renders UI).

```
app/(admin)/dashboard/projects/
├── page.tsx                    # Container — ~50 lines max
components/admin/
├── projects-table.tsx          # Presentational — table UI
├── entity-empty-state.tsx      # Shared reusable empty state
```

### Template

```typescript
// app/(admin)/dashboard/projects/page.tsx
import { getProjectsWithSkills } from "@/lib/queries/projects";
import { ProjectsTable } from "@/components/admin/projects-table";
import { getServerSession } from "@/lib/server-session";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  await requireAdmin();

  const projects = await getProjectsWithSkills();
  return <ProjectsTable projects={projects} />;
}
```

### Rules

- **Page files (`page.tsx`) must not exceed ~50 lines** — if they do, UI is leaking into the container
- **Presentational components receive all data via props** — never call `db` directly
- **Shared formatting utilities go in `lib/utils.ts`** — not redefined per page (`formatDate`, `getStatusVariant`)
- **Presentational components are `"use client"` only when they need interactivity** (delete buttons, sort toggles) — keep as Server Components when purely displaying data
- **Empty states use a shared `EntityEmptyState` component** — same pattern across all entities

---

## 2. Server Action Hardening (Strategy-like)

Every Server Action follows a **4-step strategy**: authenticate → validate → execute → revalidate. Each entity defines its own Zod schema in `lib/schemas/`, but the structure is identical.

### 4-Step Template

```typescript
'use server';

import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { entitySchema } from '@/lib/schemas/entity';

export async function createEntity(formData: FormData) {
	// 1. AUTHENTICATE AND AUTHORIZE
	await requireAdmin();

	// 2. VALIDATE
	const parsed = entitySchema.safeParse({
		name: formData.get('name'),
	});
	if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

	// 3. EXECUTE
	try {
		await db.insert(table).values(parsed.data);
	} catch {
		return { error: 'Failed to create entity.' };
	}

	// 4. REVALIDATE / REDIRECT
	redirect('/dashboard/entities');
}
```

### Action Return Type

```typescript
type ActionResult = { error: string } | { error: Record<string, string[]> } | void; // success — redirect happens
```

### Rules

- **Every action starts with `getServerSession()`** — no exceptions; redirect to `/login` if `null`
- **Every action validates with Zod `.safeParse()`** — never trust `formData.get()` directly
- **Wrap DB operations in try-catch** — return user-friendly messages, never expose raw errors
- **Remove all `console.log` statements** from actions
- **Transform empty strings to `undefined`** — forms submit `""` for empty optional fields; use `.or(z.literal(""))` or `.transform()`
- **Zod schemas live in `lib/schemas/`** — one file per entity (projects.ts, experiences.ts, skills.ts, social-links.ts, settings.ts)

### Migration Order (per entity)

1. Create Zod schema in `lib/schemas/`
2. Write Vitest tests for the schema (TDD — see `AGENTS-TESTING.md`)
3. Add auth + validation + try-catch to each action
4. Remove `console.log` statements
5. Test the full flow in the browser

---

## 3. Data Access Facade

Encapsulate all Drizzle read queries in `lib/queries/` — one file per entity. Pages import these functions instead of using `db` directly.

```
lib/queries/
├── projects.ts        # getProjectsWithSkills, getProjectById
├── experiences.ts     # getExperiencesWithSkills, getExperienceById
├── skills.ts          # getAllSkills
├── social-links.ts    # getAllSocialLinks
├── settings.ts        # getSiteSettings
```

### Template

```typescript
// lib/queries/projects.ts
import 'server-only';
import { db } from '@/db';
import { projects } from '@/db/schema/portfolio';
import { asc, eq } from 'drizzle-orm';

export async function getProjectsWithSkills() {
	return db.query.projects.findMany({
		with: {
			projectSkills: { columns: {}, with: { skill: { columns: { id: true, name: true } } } },
		},
		orderBy: [asc(projects.order)],
	});
}
```

### Rules

- **Pages never import `db` directly** — always go through `lib/queries/`
- **Server Actions still use `db` directly** — writes don't benefit from a read-only facade
- **One file per entity** — mirrors `lib/actions/` structure
- **Add `"server-only"` import** — prevents accidental client-side import
- **Keep functions simple** — one Drizzle query per function, no business logic
- **Caching goes here** — add `"use cache"` + `cacheLife()` inside facade functions; all callers benefit automatically

---

## 4. Error Boundaries

Add `error.tsx` and `loading.tsx` files to route segments for error recovery and loading states.

### Minimum Required Files

| File                                | Catches                                     |
| ----------------------------------- | ------------------------------------------- |
| `app/error.tsx`                     | Root-level fallback for any unhandled error |
| `app/(admin)/dashboard/error.tsx`   | Database failures, auth errors in dashboard |
| `app/(public)/error.tsx`            | Database failures on public portfolio page  |
| `app/(admin)/dashboard/loading.tsx` | Skeleton while dashboard data loads         |
| `app/(public)/loading.tsx`          | Skeleton while public page data loads       |
| `app/not-found.tsx`                 | Custom 404 page                             |

### Template

```typescript
// app/(admin)/dashboard/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error, show generic message, provide reset button + "go back" link
  return (/* Card with error icon, message, reset button, home link */);
}
```

### Rules

- **`error.tsx` must have `"use client"`** — required by Next.js
- **Never display `error.message` to users** — may contain SQL errors or stack traces; show generic message
- **Always provide a `reset` button** and a "go back" escape hatch
- **Use `error.digest` for server-side error correlation** — matches server logs
- **Root `error.tsx` does NOT catch root layout errors** — use `global-error.tsx` only if root layout can fail (unlikely in this project)
- **Pair `error.tsx` with `loading.tsx`** — error boundaries handle failures; loading files handle the pending state
- **Skeleton UIs must match the shape of actual content** — minimizes layout shift during streaming

---

## 5. Next.js File-System Conventions (Summary)

> Full convention reference with detailed explanations and code: [AGENTS-PATTERNS-REFERENCE.md](./AGENTS-PATTERNS-REFERENCE.md)

### Quick Reference

| Convention           | File                    | Used in Project                                | Status                       |
| -------------------- | ----------------------- | ---------------------------------------------- | ---------------------------- |
| Page                 | `page.tsx`              | Yes — 9 pages                                  | Active                       |
| Layout               | `layout.tsx`            | Yes — root, admin, public                      | Active                       |
| Loading              | `loading.tsx`           | No                                             | **Needed**                   |
| Error                | `error.tsx`             | No                                             | **Needed**                   |
| Global Error         | `global-error.tsx`      | No                                             | Optional                     |
| Not Found            | `not-found.tsx`         | No                                             | **Needed**                   |
| Forbidden            | `forbidden.tsx`         | No                                             | Experimental — not yet       |
| Unauthorized         | `unauthorized.tsx`      | No                                             | Experimental — not yet       |
| Route Handler        | `route.ts`              | Yes — auth routes                              | Active                       |
| Proxy                | `proxy.ts`              | Yes — optimistic redirects + admin CSP         | Active                       |
| Template             | `template.tsx`          | No                                             | Not needed                   |
| Default              | `default.tsx`           | No                                             | Not needed                   |
| Route Groups         | `(folder)`              | Yes — `(admin)`, `(public)`                    | Active                       |
| Dynamic Segments     | `[param]`, `[...param]` | Yes — `[id]`, `[...all]`                       | Active                       |
| Parallel Routes      | `@folder`               | No                                             | Not needed                   |
| Intercepting Routes  | `(.)folder`             | No                                             | Not needed                   |
| Route Segment Config | `export const dynamic`  | No                                             | Prefer `"use cache"` instead |
| Metadata Files       | Various                 | Partial — see [AGENTS-SEO.md](./AGENTS-SEO.md) | **Needed**                   |

### Files to Create Before Production

| Priority   | File                                                                         | Why                                        |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| **High**   | `app/error.tsx`, `app/(admin)/dashboard/error.tsx`, `app/(public)/error.tsx` | Error recovery                             |
| **High**   | `app/(admin)/dashboard/loading.tsx`, `app/(public)/loading.tsx`              | Loading skeletons                          |
| **High**   | `app/not-found.tsx`                                                          | Custom 404                                 |
| **Medium** | `app/sitemap.ts`, `app/robots.ts`, OG image, favicons                        | SEO (see [AGENTS-SEO.md](./AGENTS-SEO.md)) |
| **Low**    | `app/(admin)/dashboard/not-found.tsx`                                        | Admin 404 for missing entities             |
| **Low**    | `instrumentation.ts`                                                         | Production error tracking                  |

### Key Convention Rules

- `params` and `searchParams` are **promises** in Next.js 16 — always `await` before accessing
- Pages are async Server Components — keep them as thin containers after applying pattern 1
- Every admin page must call `getServerSession()` at the top
- Layouts **cannot** access `searchParams` — only `params` and `children`
- A `route.ts` in the same segment as `page.tsx` will conflict — they can't coexist
- Route Segment Config (`export const dynamic`, etc.) is disabled when `cacheComponents: true` — prefer `"use cache"` directive

---

## Pattern Interaction

The four patterns work together in a typical admin page:

```
Request → page.tsx (Container)
            ├── getServerSession()            ← Error Boundary catches auth failures
            ├── getProjectsWithSkills()       ← Data Access Facade (lib/queries/)
            │                                    └── Error Boundary catches DB failures
            └── <ProjectsTable />             ← Presentational Component
                    └── deleteProject()        ← Hardened Server Action
                          ├── getServerSession()
                          ├── Zod safeParse
                          ├── try-catch DB operation
                          └── revalidatePath
```

### Migration Flow

When refactoring existing pages, follow this order:

1. Create Zod schemas (`lib/schemas/`)
2. Harden server actions (auth + validation + try-catch)
3. Create data access facades (`lib/queries/`)
4. Extract presentational components (`components/admin/`)
5. Simplify page files to containers
6. Add `error.tsx` and `loading.tsx` files

---

## Implementation Checklist

### Per Entity (projects, experiences, skills, social-links, settings)

- [ ] Zod schema in `lib/schemas/` + Vitest tests
- [ ] Server actions hardened (auth + validation + try-catch + no console.log)
- [ ] Query functions in `lib/queries/`
- [ ] Presentational table component in `components/admin/`
- [ ] Page file simplified to container-only (~50 lines)

### Global (once)

- [ ] `app/error.tsx`, `app/(admin)/dashboard/error.tsx`, `app/(public)/error.tsx`
- [ ] `app/(admin)/dashboard/loading.tsx`, `app/(public)/loading.tsx`
- [ ] `app/not-found.tsx`, `app/(admin)/dashboard/not-found.tsx`
- [ ] Shared `EntityEmptyState` component
- [ ] `formatDate` and `formatDateRange` moved to `lib/utils.ts`
