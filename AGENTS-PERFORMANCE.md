# AGENTS-PERFORMANCE.md

Performance guidelines for the portfolio project — project-specific guidance that ties together the installed skills.

> **Before implementing caching (`use cache`, PPR, `cacheLife`, `cacheTag`), execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/next-cache-components/SKILL.md`

> **Before optimizing bundle or rendering performance, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/vercel-react-best-practices/SKILL.md`

> **Before adjusting Next.js data patterns or RSC boundaries, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/next-best-practices/SKILL.md`

> **Before restructuring component tree for performance, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/vercel-composition-patterns/SKILL.md`

---

## React Compiler

Enabled in this project (`reactCompiler: true` in `next.config.ts`). Automatically inserts memoization at build time.

| Before (manual)                     | After (compiler handles it)         |
| ----------------------------------- | ----------------------------------- |
| `useMemo(() => calc(data), [data])` | `const result = calc(data)`         |
| `useCallback((id) => fn(id), [fn])` | `const handler = (id) => fn(id)`    |
| `React.memo(Component)`             | `function Component(props) { ... }` |

### Rules

- **Do NOT use `useMemo`, `useCallback`, or `React.memo`** — redundant with the compiler
- **Write plain, readable code** — the compiler optimizes it
- **Keep components pure** — same output for same props, no mutations during render
- **Side effects only in `useEffect`, event handlers, or Server Actions**
- **Do NOT use `React.forwardRef`** — React 19 supports `ref` as a regular prop
- If the compiler can't safely optimize code, it silently skips it (no errors)

---

## Dynamic Imports & Code Splitting

Use `next/dynamic` to reduce initial JS bundle:

```typescript
import dynamic from "next/dynamic";

const HeavyEditor = dynamic(() => import("@/components/admin/editor"), {
  loading: () => <Spinner />,
});

const ChartComponent = dynamic(() => import("@/components/chart"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-muted rounded-md" />,
});
```

### When to Use

- Heavy components not visible on initial load (modals, editors, charts)
- Admin-only components behind authentication
- Client-only libraries using browser APIs (`window`, `document`)

### What NOT to Dynamically Import

- Layout components (header, sidebar) — always needed immediately
- Small, lightweight components — overhead outweighs savings
- Server Components — automatically code-split by Next.js

### Project-Specific Guidance

| Component                  | Dynamic? | Reason                          |
| -------------------------- | -------- | ------------------------------- |
| Admin sidebar/header       | No       | Always visible                  |
| Login form                 | No       | Lightweight, needed immediately |
| Skills multi-select (cmdk) | Yes      | Heavy dependency, only in forms |
| Data tables                | No       | Primary dashboard content       |
| Delete confirmation dialog | Yes      | Only on user action             |
| Public portfolio page      | No       | All content is primary          |

---

## Loading Files & Streaming

`loading.tsx` files wrap their sibling `page.tsx` in `<Suspense>` automatically, streaming the layout while data loads.

### Skeleton Pattern

```typescript
// app/(admin)/dashboard/projects/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      {/* Match the shape of actual content to minimize layout shift */}
    </div>
  );
}
```

### Granular Streaming

For pages with multiple independent data sources, use separate `<Suspense>` boundaries:

```typescript
<Suspense fallback={<StatsSkeleton />}>
  <DashboardStats />
</Suspense>
<Suspense fallback={<ProjectsSkeleton />}>
  <RecentProjects />
</Suspense>
```

### Where to Add Loading Files

| Route                                    | Needed? | Reason                     |
| ---------------------------------------- | ------- | -------------------------- |
| `app/(admin)/dashboard/*/page.tsx` (all) | Yes     | All fetch from DB          |
| `app/(public)/page.tsx`                  | Yes     | Fetches all portfolio data |
| `app/(admin)/login/page.tsx`             | No      | No data fetching           |

---

## Bundle Optimization

### `optimizePackageImports`

Already configured in `next.config.ts` for `lucide-react`, `react-icons`, `@radix-ui/react-icons`. Ensures only used exports are bundled even with barrel file imports.

### Rules

- **Import specific exports** — `import { Heart } from "lucide-react"`, not `import * as Icons`
- **No barrel imports** (`import * as ...`) — tree shaking may miss some
- **Analyze periodically** — `pnpm next experimental-analyze` to find oversized dependencies

---

## Server vs Client Decision Tree

```
Is the component interactive (onClick, onChange, state, effects)?
├── NO → Server Component (default, no directive)
│   - Zero client JS, direct DB access, secrets stay on server
│
└── YES → Does the ENTIRE component need interactivity?
    ├── NO → Split: data fetching in Server Component, pass props to Client
    └── YES → Client Component ("use client")
        - Keep small, import into Server parent, never fetch data inside
```

### Project-Specific Boundaries

| Component                  | Type   | Reason                         |
| -------------------------- | ------ | ------------------------------ |
| Dashboard layout           | Server | Static structure               |
| Sidebar navigation         | Client | Active state, mobile toggle    |
| Projects list page         | Server | Data fetching, table rendering |
| Delete confirmation dialog | Client | Modal state, click handlers    |
| Login form                 | Client | Form state, submission         |
| Public portfolio page      | Server | Static rendering, SEO          |
| Skills multi-select        | Client | Combobox interactivity (cmdk)  |

---

## Core Web Vitals

### LCP (Largest Contentful Paint) — Loading

| Rating            | Threshold |
| ----------------- | --------- |
| Good              | <= 2.5s   |
| Needs Improvement | 2.5s–4.0s |
| Poor              | > 4.0s    |

**Optimizations in this project**: `priority` on above-fold images, `next/font` for fonts, `"use cache"` + `cacheLife` for data, Server Components on public page, `loading.tsx` for instant shell.

### INP (Interaction to Next Paint) — Interactivity

| Rating            | Threshold   |
| ----------------- | ----------- |
| Good              | <= 200ms    |
| Needs Improvement | 200ms–500ms |
| Poor              | > 500ms     |

**Optimizations**: React Compiler auto-memoization, Server Components by default (minimal client JS), dynamic imports for heavy components, `startTransition` for mutations.

### CLS (Cumulative Layout Shift) — Visual Stability

| Rating            | Threshold |
| ----------------- | --------- |
| Good              | <= 0.1    |
| Needs Improvement | 0.1–0.25  |
| Poor              | > 0.25    |

**Optimizations**: `next/image` with dimensions (prevents shift), `next/font` (no FOUT), skeleton UIs matching content shape, no content injection above existing elements.

---

## Performance evidence

Review application operation durations in Vercel Runtime Logs and the platform's
available duration/usage views. Browser tests and Lighthouse provide synthetic
performance evidence. Real-user Web Vitals collection is not configured.

---

## Pre-Production Checklist

### Rendering & Components

- [ ] Data-fetching components are Server Components
- [ ] `"use client"` pushed as low as possible in the tree
- [ ] No `useMemo`/`useCallback`/`React.memo`/`React.forwardRef`
- [ ] Admin routes not in public bundle (route groups separate them)

### Caching

- [ ] `cacheComponents: true` in `next.config.ts`
- [ ] Infrequently-changing data uses `"use cache"` + `cacheLife`
- [ ] Runtime data (`cookies`, `headers`) read outside `"use cache"` scope

### Loading & Images

- [ ] Every dashboard page has `loading.tsx` with matching skeleton
- [ ] All images use `next/image`; above-fold images have `priority`
- [ ] Responsive images have `sizes` prop

### Bundle & Monitoring

- [ ] Heavy components use `dynamic()` imports with `loading` fallbacks
- [ ] No barrel imports (`import * as ...`)
- [ ] Lighthouse >= 90 (all categories) on production build

## Production telemetry and cache ownership

`observeOperation` retains classified timing logs with bounded operation names.
Compare representative durations by operation and release. Playwright timing is
synthetic evidence; the application does not collect real-user percentiles.

CI and Vercel build-cache controls are separate from Cache Components, ISR/data
caches and CDN behavior. Never disable legitimate runtime caching to comply with
no-build-cache policy. Do not read request headers inside public cache entries just
to add telemetry. See [operations](./docs/operations/services.md) for supported
serverless signals, plan limitations and provider views. Commands in this guide
remain subject to the root local-verification restriction.
