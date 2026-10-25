# Custom Grid Item for Portfolio — Enhancement Prompt

**Reference**: Inspired by [nevflynn.com](https://nevflynn.com/) but must be **distinct**, not a copy.

**Skills to apply**: `/frontend-design` `/web-design-guidelines` `/shadcn-ui` `/tailwind-v4-shadcn`

**Context files**:
- `.specstory/history/2026-02-19_10-37Z-website-animation-techniques.md` — animation patterns, grid behavior, navbar interaction
- `.specstory/history/2026-02-20_10-49Z-color-palette-for-portfolio-project.md` — Graphite / Cyan / Ember palette (already in `app/globals.css`)

---

## Objective

Design and implement a **custom grid item component** for the portfolio bento grid (`components/public/portfolio-grid.tsx`). The item should feel inspired by Nev Flynn’s bento-style blocks (compact, content-rich, interactive) but with its own visual identity and behavior.

---

## What to Do (High-Level)

1. **Define grid item variants** — Create distinct item types (e.g. hero/about, project card, article teaser, CTA/newsletter, media/now-playing) that map to your sections (All, About me, Projects, Experience, Contact). Each variant should have its own layout and content structure.

2. **Design the visual system** — Use the existing Graphite / Cyan / Ember palette from `globals.css`. Avoid Nev’s black/white/pink; lean on `--primary` (cyan-teal), `--accent` (ember), and semantic tokens (`bg-card`, `border-border`, `text-muted-foreground`). Ensure light and dark themes both work.

3. **Implement the component(s)** — Build a reusable `GridItem` (or variant-specific components) that:
   - Accepts props for size (`w`, `h`), variant type, and content
   - Uses shadcn/ui primitives where appropriate (Card, Button, etc.)
   - Follows Tailwind v4 patterns (`@theme inline`, CSS variables, no `@apply` in `@layer base` per tailwind-v4-shadcn skill)
   - Integrates cleanly with `react-grid-layout` (no layout conflicts)

4. **Add motion and interaction** — Apply animation techniques from the animation spec story:
   - Staggered entrance on load (e.g. `animation-delay` or Motion `staggerChildren`)
   - Hover/focus states with clear feedback
   - Honor `prefers-reduced-motion` (reduced or no animation when requested)
   - Animate only `transform` and `opacity` for compositor-friendly performance

5. **Ensure accessibility and guidelines compliance** — Follow Vercel Web Interface Guidelines:
   - Semantic HTML (`article`, `section`, `h2`, etc.)
   - Icon-only buttons with `aria-label`
   - Visible focus states (`focus-visible:ring-*`)
   - Correct heading hierarchy
   - Images with `alt`, `width`, `height`

6. **Differentiate from Nev Flynn** — Avoid direct mimicry:
   - Different typography (avoid Moranga/Silka; choose a distinctive pairing)
   - Different layout rhythm (asymmetry, spacing, or density)
   - Different interaction patterns (e.g. no drag if you prefer static; or different drag feedback)
   - Your own “memorable hook” (e.g. a signature accent treatment, border style, or micro-interaction)

7. **Wire into `PortfolioGrid`** — Replace placeholder colored divs with the new grid item components, passing real or mock content. Ensure section filtering (All, About me, Projects, etc.) shows the correct item set per section.

---

## Constraints

- Use **pnpm** for package management.
- Stay within **shadcn/ui**, **Tailwind v4**, and **Motion** (per AGENTS.md).
- Do not introduce new color tokens; use the existing palette.
- Keep the grid responsive; items should behave well at different viewport widths.

---

## Deliverables

- `GridItem` (or equivalent) component(s) in `components/public/`
- Updated `portfolio-grid.tsx` using the new items
- Any new CSS or theme tweaks in `app/globals.css` if needed (following the four-step Tailwind v4 pattern)
