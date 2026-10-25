# Improve the About Me Button Hover

<!-- cspell:ignore kombai -->

## Objective

Produce three visual options for improving the hover feedback of the **About
Me** button in `components/public/info-grid-item-content.tsx` without moving the
button or changing the surrounding layout. The result of this task is a design
canvas for review, not an implementation.

## Non-Negotiable Delivery Rule

**Do not create, modify, or apply code in
`components/public/info-grid-item-content.tsx` or any other source file.** Do
not implement any hover option directly, even if one option appears clearly
preferable.

The only deliverable is one new `.canvas` file inside `.kombai/canvas/`. Do not
overwrite or modify an existing canvas. The new canvas must contain
exactly three clearly labeled result options. Stop after producing the canvas
and wait for the user to select an option before any code implementation.

## Required Context

Before creating the canvas, read and follow:

- `AGENTS.md`
- `AGENTS-DESIGN.md`, especially the button and interactive-state guidance
- `AGENTS-ANIMATIONS.md`, especially interaction timing and reduced motion
- `AGENTS-ACCESSIBILITY.md`, especially focus, touch-target, and motion guidance
- `components/ui/button.tsx` for the installed shadcn Button API and variants
- `.claude/skills/shadcn/SKILL.md`
- `.claude/skills/frontend-design/SKILL.md`
- `.claude/skills/tailwind-design-system/SKILL.md`
- `.claude/skills/web-design-guidelines/SKILL.md`

Do not use `.specstory` as context.

## Current Problem

The button root currently includes these classes:

```txt
motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0
```

The hover transform lifts the entire control. This makes its visible position
change and creates unwanted movement inside the card. Treat the current source
as read-only reference material.

## Canvas Deliverable

- Create one new `.canvas` file in `.kombai/canvas/`.
- Present exactly three distinct options in separate, clearly labeled frames.
- Show each option in the existing About card context, not as an isolated generic
  button.
- For every option, show the resting and hovered states side by side at the same
  scale and coordinates so movement can be compared visually.
- Include short annotations for hover, `focus-visible`, active, and reduced-motion
  behavior. Describe behavior without adding production code to the repository.
- Keep the button's outer geometry identical across every state and option.

The three required directions are:

1. **Surface + Arrow** — increase surface, border, and shadow feedback while the
   arrow nudges inside a fixed icon slot.
2. **Inset Sweep** — use a clipped internal highlight or sheen with restrained
   arrow feedback; nothing may escape or move the button boundary.
3. **Minimal Contrast** — use stationary background, border, and shadow changes
   with no moving inner elements.

## Requirements for All Three Options

### Keep the outer button stationary

- Base every proposal on the existing shadcn `Button` with `type="button"`,
  `size="lg"`, and `onClick={() => setSection('About me')}`.
- Preserve the `About Me` label, pill shape, and `min-h-11` minimum touch target.
- Propose no hover, focus, or active transforms on the `Button` root.
- Do not show or recommend changes to the button's width, height, padding,
  margin, position, gap, or border width between interaction states.
- Keep a constant border width in every state so the box geometry cannot change.

### Improve surface feedback

- Preserve the default primary Button surface and its semantic
  `hover:bg-primary/90` direction where applicable to the option.
- Use existing semantic primary or primary-foreground tokens for borders and
  surface details.
- Use an inset shadow for active feedback instead of translating or scaling the
  button.
- Annotate surface transitions as 200ms `ease-out` and limited to
  `background-color`, `border-color`, and `box-shadow`.
- Do not add hardcoded colors, new theme tokens, JavaScript animation, or a new
  dependency.

### Animate only the arrow

- Keep `ArrowRight` decorative and hidden from assistive technology in any later
  implementation.
- In options that move the arrow, reserve a fixed-size, shrink-proof icon slot so
  movement cannot alter the label position, button dimensions, or flex gap.
- Keep the icon slot large enough for the arrow's complete hover travel; do not
  show the arrow clipped.
- Limit arrow travel to a maximum of `0.5` Tailwind spacing units to the right.
- Annotate arrow movement as a 200ms `ease-out` transform transition that is
  disabled for `prefers-reduced-motion`.

### Preserve interaction and accessibility

- Preserve the Button component's existing keyboard activation and focus ring in
  every proposal.
- Give keyboard focus the same visual intent as pointer hover.
- Preserve the 44px touch target and account for `touch-manipulation` without
  changing the hit area.
- Ensure the result works in both light and dark themes and uses semantic tokens
  only.
- Do not change query-state behavior, copy, card layout, or unrelated controls.

## Acceptance Criteria

- Exactly one new `.canvas` file exists in `.kombai/canvas/`.
- The canvas contains exactly three clearly labeled result options: **Surface +
  Arrow**, **Inset Sweep**, and **Minimal Contrast**.
- Each option shows resting and hovered states in the About card context.
- Hovering the button does not change its `x`, `y`, width, or height.
- Hovering does not move the label, card content, or neighboring elements.
- The stationary button gains clearer surface, border, and shadow feedback.
- Where an option moves the arrow, it is the only moving element and stays fully
  visible inside its reserved slot.
- `focus-visible` provides the same visual intent while retaining the existing
  accessible focus ring.
- Active feedback does not translate or scale the button.
- With reduced motion enabled, no button or arrow movement occurs.
- Clicking, pressing Enter, or pressing Space still opens the **About Me**
  section through the existing `nuqs` query state.
- The button remains at least 44px high and works in light and dark themes.
- No component, stylesheet, configuration, test, or other production source file
  is created or modified.

## Verification

1. Confirm the new canvas contains exactly three options and each includes
   aligned resting and hovered states.
2. Confirm the canvas annotations cover `focus-visible`, active, reduced motion,
   semantic tokens, and stationary outer geometry.
3. Use `git status --short` and `git diff --name-only` to confirm the new canvas
   is the only task artifact and no production source file changed.
4. Run:

    ```sh
    pnpm format:check
    pnpm spellcheck
    ```

Do not run implementation-specific tests or `pnpm build` for this design-only
task. Do not modify source code after reviewing the canvas; implementation
requires a separate user selection and request.
