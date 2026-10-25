# Project Card — GridItem Variant — Enhancement Prompt

**Reference**: Inspired by [nevflynn.com](https://nevflynn.com/) card style (compact, content-rich, rounded blocks) but not bound to it — find your own voice.

**Skills to apply**: `/frontend-design` `/web-design-guidelines` `/shadcn-ui` `/tailwind-v4-shadcn`

**Context files**:
- `.specstory/history/2026-02-28_17-23Z-toast-notification-implementation-approaches.md` — drag-and-drop order update is now functional in the admin CMS (stable `project.id` sortable key, local state for instant feedback, toast confirmations)
- `.specstory/history/2026-02-23_08-38Z-relative-spacing-in-nevv-s-grid.md` — grid spacing decisions, `px-[3.5vw]`, bento layout rhythm
- `.specstory/enhancement-prompts/custom-grid-item-inspired-by-nevflynn.md` — existing GridItem component design decisions and visual system
- `components/public/grid-item.tsx` — current `GridItem` component with variant system (`about`, `project`, `experience`, `contact`, `map`)
- `components/public/portfolio-grid.tsx` — bento grid using `react-grid-layout`, section filtering via `nuqs`
- `lib/types.d.ts` — `ProjectInfo` interface (the data shape)
- `db/schema/portfolio.ts` — project schema (source of truth)
- `lib/queries/projects.ts` — `getProjects()` query with skills relation

---

## Objective

Create an **MVP project card** component that renders inside the existing `GridItem` when `variant="project"`. Each card represents a `ProjectInfo` from the database. The cards must work in **both vertical and horizontal orientations** — they will be placed in varying grid cell sizes (e.g. `w:1 h:6`, `w:2 h:4`, `w:1 h:4`) so the layout cannot assume a fixed aspect ratio.

---

## Available Data per Project

From `ProjectInfo`:

| Field | Type | Notes |
|-------|------|-------|
| `title` | `string` | Always present |
| `description` | `string` | Always present |
| `url` | `string \| null` | Live project link |
| `repoUrl` | `string \| null` | GitHub repo link |
| `status` | `"active" \| "archived" \| "in-progress"` | Project status |
| `projectSkills` | `{ skill: { id, name } }[]` | Associated tech stack |

---

## What to Do (execute in steps)

1. **Design the project card layout** — The card must be flexible enough to look good in both tall/narrow and wide/short grid cells. Consider a fluid layout approach where content reflows naturally: title at the top, description in the middle, skills/links at the bottom. Avoid rigid height/width assumptions. Think about how Nev Flynn's cards feel compact and dense without being cluttered — apply that density principle but with your own spacing and hierarchy.

2. **Build the `ProjectCard` presentational component** — Create a new component in `components/public/` that receives `ProjectInfo` as props and renders inside a `GridItem`. Use the existing design tokens (`bg-card`, `text-card-foreground`, `text-muted-foreground`, `--primary`, `--accent`) and shadcn/ui primitives (`Badge`, `Button`). Show:
   - Project title (prominent)
   - Description (truncated/clamped if the cell is small)
   - Skills as compact badges or tags
   - Action links (live URL, repo URL) as icon buttons when available
   - Status indicator (subtle — a dot, badge, or border accent)

3. **Handle orientation flexibility** — The card must not break when the grid cell changes shape. Use CSS strategies like `line-clamp`, `min-h-0`, `overflow-hidden`, flexible gap/padding, and content that gracefully degrades in smaller cells. In wider cells, content can breathe more; in narrower cells, descriptions truncate and skills may wrap or hide.

4. **Integrate into `PortfolioGrid`** — Wire the project cards into the grid. Fetch projects server-side and pass them down. Each project card should be a `GridItem variant="project"` with its own grid key. The `order` field from the database determines display priority/position. Respect the section filtering — project cards only appear in the "All" and "Projects" sections.

5. **Add hover/interaction states** — Apply subtle hover feedback (e.g. slight scale, border highlight, shadow lift) consistent with the existing card style. Links should be clearly interactive. Honor `prefers-reduced-motion`.

6. **Ensure accessibility** — Semantic HTML (`article` for each card), heading hierarchy, icon-only links with `aria-label`, visible focus states.

---

## Constraints

- Use **pnpm** for any package additions.
- Stay within the existing palette and design tokens — no new color tokens.
- Use **shadcn/ui** components (`Badge`, `Button`, `Card`) where appropriate.
- The card is an **MVP** — keep it simple and shippable. No image support yet (that's a future feature).
- The `GridItem` `variant="project"` already exists in the type system — extend it, don't duplicate.
- Cards render in a `react-grid-layout` grid — they must fill `size-full` and not fight the layout.

---

## Deliverables

- `ProjectCard` component in `components/public/`
- Updated `portfolio-grid.tsx` with project cards wired in
- Any minor adjustments to `grid-item.tsx` if needed for the `project` variant
