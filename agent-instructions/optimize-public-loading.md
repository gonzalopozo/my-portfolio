# Optimize public loading

## Objective

Reduce public JavaScript and make portfolio cards readable before hydration while
preserving CMS icon selection, desktop dragging, and responsive card layouts.

## Context

The recorded production capture downloads about 1.08 MB of JavaScript, expanding
to 5.64 MB. Under 10 megabits per second networking, 80 ms latency, and 4× CPU slowdown, the grid
starts appearing at 3.38 seconds and is fully visible at 4.02 seconds. Public
client imports retain entire icon packs, MapLibre loads with the grid, and width
measurement plus an entrance animation delays card visibility.

## Required behavior

- Resolve icons on the server and pass rendered content into interactive clients.
  Preserve the entire CMS catalog, custom SVGs, and existing icon identifiers.
  Do not copy SVG paths or introduce a fixed public icon allowlist.
- Defer MapLibre until the location card is visible and the browser is idle after
  a paint. Keep a stable location preview and accessible story trigger while the
  renderer loads, and retain the preview when loading fails.
- Render responsive cards in HTML without waiting for hydration or measurement.
  Enhance the same card elements with desktop dragging after measurement.
- Remove the initial hidden entrance animation; preserve section transitions,
  URL history, mobile ordering, saved arrangements, theme controls, and focus.
- Isolate the nuqs search-parameter subscription in a small Suspense bridge so it
  cannot suspend the visible grid during prerendering.
- Await cached portfolio data before returning the public page. A full-grid
  Suspense fallback leaves streamed cards hidden until an inline script runs,
  which prevents reading the page with JavaScript disabled.
- Invalidate the public route after successful CMS writes as well as expiring its
  data tags, so prerendered HTML reflects content and icon changes immediately.

## Constraints

- Use pnpm, add no dependencies or schema changes, and preserve the visual design.
- Follow the root verification restriction: do not run any checks unless the user
  explicitly requests a commit. Implementation approval does not authorize checks.
- Work on a feature branch. Do not commit or publish without instruction.

## Acceptance criteria

- CMS selections from any supported pack render without a source edit or deploy.
- Public clients import neither complete icon packs nor the admin catalog.
- Cards remain readable with JavaScript disabled at mobile, tablet, and desktop
  widths; hydration does not replace the card tree or reset retained controls.
- The map preview remains usable if imports, WebGL, or external map resources fail.
- Existing navigation, dragging, reduced motion, and map story behavior remain.
- Compare three cold and warm captures using the original conditions; target at
  least 50% less JavaScript before map activation and 50% faster full grid
  visibility, with CLS no higher than 0.1. Report measurements, not estimates.

## Verification commands

Only after an explicit commit request, the prescribed verification subagent runs
the complete root pre-commit sequence: `git status --short`, `git diff --check`,
`pnpm format:check`, `pnpm lint`, `pnpm exec tsc --noEmit`,
`pnpm exec vitest run`, `pnpm spellcheck`, `pnpm knip`, `pnpm depcruise`, and
`pnpm build`. CI runs production E2E through `pnpm test:e2e:prod` independently.
Production bundle inspection and repeated performance captures also remain
subject to the root local-verification restriction.
