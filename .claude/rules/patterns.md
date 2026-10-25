---
description: Architecture pattern rules — Container-Presentational, Server Action hardening, Data Access Facade, Error Boundaries.
globs:
    - 'app/**'
    - 'lib/actions/**'
    - 'lib/queries/**'
    - 'lib/schemas/**'
    - 'components/admin/**'
---

## Architecture Rules

### Container-Presentational

- **page.tsx must not exceed ~50 lines** — if it does, UI is leaking into the container
- Presentational components receive all data via props — never call `db` directly
- Presentational components are `"use client"` only when they need interactivity
- Shared formatting goes in `lib/utils.ts`, not redefined per page

### Server Action Hardening (every action, no exceptions)

1. **Authenticate**: `getServerSession()` first, redirect to `/login` if null
2. **Validate**: Zod `.safeParse()` — never trust `formData.get()` directly
3. **Execute**: try-catch around DB operations, return user-friendly errors
4. **Revalidate**: `redirect()` for create, `revalidatePath()` for update/delete

- Zod schemas live in `lib/schemas/` — one file per entity
- Transform empty strings to `undefined` — forms submit `""` for empty optional fields
- Remove all `console.log` from actions

### Data Access Facade

- **Pages never import `db` directly** — always go through `lib/queries/`
- Server Actions still use `db` directly (writes don't need the facade)
- One file per entity in `lib/queries/`, add `"server-only"` import
- Caching goes here — `"use cache"` + `cacheLife()` inside facade functions

### Error Boundaries

- `error.tsx` must have `"use client"` — required by Next.js
- Never display `error.message` to users — show generic message
- Always provide a reset button and a "go back" link

### Next.js 16 Specifics

- `params` and `searchParams` are **promises** — always `await` before accessing
- Every admin page must call `getServerSession()` at the top
- Layouts cannot access `searchParams` — only `params` and `children`
- `route.ts` and `page.tsx` cannot coexist in the same segment

Full templates and checklists: see AGENTS-PATTERNS.md
