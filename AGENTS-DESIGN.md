# AGENTS-DESIGN.md

Visual design system for the portfolio's public page — theme tokens, bento grid vocabulary, card anatomy, pill navbar, and interactive patterns.

> **Before applying or extending this design system, execute the following skills** — read each SKILL.md and follow its instructions:
>
> 1. `.claude/skills/shadcn/SKILL.md` (component styling, token usage)
> 2. `.claude/skills/tailwind-design-system/SKILL.md` (Tailwind v4 `@theme`, OKLCH)
> 3. `.claude/skills/frontend-design/SKILL.md` (visual quality, polish)
> 4. `.claude/skills/web-design-guidelines/SKILL.md` (compliance review)

**Related coverage in other AGENTS files (do not duplicate):**

- `AGENTS-ANIMATIONS.md` — timing, easing, Motion/NumberFlow rules
- `AGENTS-ACCESSIBILITY.md` — contrast ratios, touch targets, reduced motion, landmarks
- `AGENTS-PERFORMANCE.md` — code splitting, loading states, bundle optimization

---

## 1. Design Philosophy

Spatial density and card scale ARE the visual language. Visual hierarchy comes from card size contrast, not from typographic weight or color loudness. The portfolio should feel **technical but warm** — a developer who cares about craft.

### Principles

1. **Cards first** — every piece of content lives inside a card. The grid IS the layout.
2. **Generous radii** — large corner radii on cards, pill-shaped nav. Soften the technical content.
3. **Surface contrast, not shadow** — cards float via background-to-card color difference, not drop shadows.
4. **One signature, two themes** — vermilion anchors equally considered light and dark experiences.
5. **Restraint** — a precise vermilion signature, subtly warm neutrals, and distinct semantic status colors.
6. **Every decision works in both themes** — light and dark are designed in parallel, not as afterthoughts.

---

## 2. Theme Tokens

The selected identity is **A — Balanced vermilion and warm ink**. Light and dark share the same signature family, with equal attention to readability. Use `app/globals.css` as the source of truth; values are expressed in OKLCH, converted from the approved sRGB references below.

### 2.1 Light and Dark Palettes

| Role                       | Light reference | Dark reference |
| -------------------------- | --------------- | -------------- |
| Background                 | `#F4F2EF`       | `#151413`      |
| Card / popover             | `#FFFEFC`       | `#211F1D`      |
| Foreground                 | `#22201F`       | `#F5F2EE`      |
| Secondary / muted / accent | `#E9E5E1`       | `#2E2B28`      |
| Muted foreground           | `#66615D`       | `#BBB3AA`      |
| Primary                    | `#B73820`       | `#FF805F`      |
| Primary foreground         | `#FFFFFF`       | `#21140F`      |
| Primary hover              | `#A7331D`       | `#FF8B6D`      |
| Primary pressed            | `#9A2F1B`       | `#FF9479`      |
| Decorative border          | `#D6CFC8`       | `#49433E`      |
| Input boundary             | `#8B8178`       | `#887E74`      |
| Destructive                | `#A32148`       | `#FF91B3`      |
| Destructive foreground     | `#FFFFFF`       | `#21140F`      |
| Destructive hover          | `#8E1C3F`       | `#FFA2BF`      |

### 2.2 Color Roles

- `primary` is the vermilion signature: actions, links, selected public navigation, and focus.
- `accent` is a quiet neutral interaction background, used by menus and admin selections. It is not a second brand color.
- `ring` matches `primary`. Keep focus opaque with a contrasting offset; never reduce ring opacity to create a decorative glow.
- Use `input` for boundaries needed to identify controls. `border` is a quieter decorative separator and is not required to meet 3:1.
- Use explicit `primary-hover`, `primary-pressed`, and `destructive-hover` surfaces rather than reducing filled-button opacity.

### 2.3 Contrast Requirements

Normal text must reach 4.5:1; large text (24px normal or approximately 18.67px bold) must reach 3:1. Required control boundaries, meaningful icons, and focus indicators must reach 3:1 against adjacent colors. Primary reading text targets 7:1 or higher.

The selected palette provides 16.10:1 / 14.72:1 for primary text on cards and 4.88:1 / 6.80:1 for secondary text on secondary surfaces (light / dark). Verify composited colors separately for transparency, gradients, and images. Color must be accompanied by labels or icons for status and errors.

### 2.4 Status and Media Tokens

| Role               | Light     | Dark      |
| ------------------ | --------- | --------- |
| Status active      | `#28704E` | `#83C6A0` |
| Status in progress | `#356D82` | `#8DC3D8` |
| Status archived    | `#835E14` | `#D5B477` |

For text on artwork, use `media-background` (`#151413`) at 80% opacity with opaque `media-foreground` (`#FFFFFF`). This provides a reliable reading surface even over white artwork. `media-primary` (`#FF805F`) provides a warm highlight on that dark surface in either theme. Avoid using the quiet `accent` background as foreground text.

The BB-8 illustration uses its own `--bb8-accent` variable. Keep illustration colors independent from global UI tokens. CMS-configured social colors retain their automatic black/white foreground selection.

### 2.5 Chart Palette

Chart colors use vermilion, green, plum, blue, and ochre, with brighter equivalents in dark mode. Use labels or other cues alongside color; a palette alone does not make a chart accessible.

### 2.6 Sidebar Tokens (Admin Dashboard)

Sidebar surfaces and text mirror card tokens. Active and hover backgrounds use the quiet secondary surface. Primary actions retain vermilion. Forms use opaque surfaces with `input` boundaries so contrast does not depend on an ancestor's background.

### 2.7 Typography Tokens

Font stack is already configured in `app/layout.tsx`:

| Token               | Value                  | Use                      |
| ------------------- | ---------------------- | ------------------------ |
| `--font-geist-sans` | Geist (next/font)      | Body text, headings, UI  |
| `--font-geist-mono` | Geist Mono (next/font) | Code, technical metadata |

**Rationale**: Geist is purpose-built for developer tools — clean, legible at small sizes, excellent monospace companion. No font changes needed.

### 2.8 Border Radius

| Element                                 | Class                             | Value          | Purpose                              |
| --------------------------------------- | --------------------------------- | -------------- | ------------------------------------ |
| Grid cards                              | `rounded-4xl`                     | 2rem (32px)    | Signature aesthetic — generous, soft |
| Normal rectangular button inside a card | `rounded-2xl`                     | 1rem (16px)    | Button shape with clear card nesting |
| Square icon button inside a card        | `rounded-2xl`                     | 1rem (16px)    | Tool/action tile, not a pill         |
| Large prominent button inside a card    | `rounded-[1.25rem]`               | 1.25rem (20px) | Bigger action without full capsule   |
| Pill / CTA button                       | `rounded-full`                    | 9999px         | Soft capsule CTA                     |
| Button flush with card bottom edge      | `rounded-t-2xl rounded-b-4xl`     | 16px / 32px    | Outer bottom corners align to card   |
| Pill navbar                             | `rounded-full`                    | 9999px         | Capsule shape                        |
| Nav active indicator                    | `rounded-full`                    | 9999px         | Pill highlight inside navbar         |
| shadcn components                       | `rounded-lg` (default `--radius`) | 0.5rem (8px)   | Base radius before explicit override |
| Other nested elements in cards          | `rounded-xl`                      | 0.75rem (12px) | Tags, badges, inner containers       |

Keep `--radius: 0.5rem` as the shadcn base. Grid card and public card-control radii are applied directly via Tailwind utility classes, not through the `--radius` variable.

When a card control touches an outer card edge, align only the exterior corners to the card radius. For a full-width button attached to the bottom of a grid card, use `rounded-t-2xl rounded-b-4xl`. For partial-edge controls, apply `rounded-bl-4xl` and/or `rounded-br-4xl` only to the corners that touch the card edge.

> If `rounded-4xl` is not available in Tailwind v4 defaults, define it in `@theme`:
>
> ```css
> @theme {
> 	--radius-4xl: 2rem;
> }
> ```

### 2.9 Shadows

Minimal shadow usage — cards float via surface color contrast.

| Element          | Light mode                      | Dark mode                             |
| ---------------- | ------------------------------- | ------------------------------------- |
| Grid cards       | `shadow-none` or `shadow-sm`    | `shadow-none`                         |
| Popover/dropdown | `shadow-md`                     | `shadow-lg` (needs more lift on dark) |
| Navbar           | `shadow-sm` or frosted backdrop | `shadow-none` + border                |

The base `Card` component in `components/ui/card.tsx` has `shadow-sm` by default. Grid cards override this in `GridItem` if needed.

---

## 3. Grid System

Tablet and desktop use `react-grid-layout`. Mobile uses a natural-height CSS grid with two columns. Card descriptors and section query state are shared between both renderers.

### 3.1 Breakpoints & Columns

| Breakpoint | Name    | Min width | Columns | Use                                                    |
| ---------- | ------- | --------- | ------- | ------------------------------------------------------ |
| `lg`       | Desktop | 996px     | 4       | Full bento layout                                      |
| `md`       | Tablet  | 768px     | 4       | Simplified 2-column                                    |
| `sm`       | Mobile  | 0px       | 2       | Reading cards span both columns; square utilities pair |

The mobile boundary is **viewport width below 768px**, shared by CSS and `usePortfolioMedia`. At 768px and above, the measured grid width selects `lg` at 996px or `md` below that. Do not select mobile behavior from the narrower padded grid container.

### 3.2 Row Height & Gap

| Property            | Value                                      | Notes                                                     |
| ------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `rowHeight`         | `34.5px`                                   | Bento card height includes the 16px gaps between its rows |
| Gap (margin)        | `16px` (1rem)                              | Inter-card spacing via react-grid-layout `margin` prop    |
| Container max-width | `1308.6px`                                 | Centered grid container                                   |
| Container padding   | `px-4` mobile; `px-[3.5vw]` tablet/desktop | Horizontal breathing room                                 |

### 3.3 Named Card Sizes

Shared vocabulary for layout composition. Sizes refer to `{w, h}` values in react-grid-layout at the `lg` breakpoint (4 columns). `portfolio-grid-layout.ts` is the source of truth for slot dimensions.

| Name         | w × h  | Pixel size (approx)    | Use                                             |
| ------------ | ------ | ---------------------- | ----------------------------------------------- |
| **hero**     | 2 × 6  | ~half width × 287px    | Introduction                                    |
| **wide**     | 2 × 6  | ~half width × 287px    | Horizontal project, hobbies, experience summary |
| **standard** | 1 × 6  | ~quarter width × 287px | Map, music, social, theme                       |
| **tall**     | 1 × 12 | ~quarter width × 590px | Vertical project                                |

At `md` (4 columns): introduction → 4×8, wide → 4×6, standard → 2×6, tall → 2×12.

At `sm` (CSS grid): reading cards span two columns and grow naturally; square cards span one column with a 1:1 ratio. Mobile has no row-height layout metadata or draggable renderer.

### 3.4 Content Adaptation Rules

- When a card goes from **tall** to **wide** (responsive rearrangement), content reflows from vertical to horizontal. Use `flex-direction` or `grid-template` changes.
- **Never truncate essential content to fit a card size** — resize the card instead.
- Images and maps in cards use `object-cover` + `overflow-hidden` on the card for radius clipping.

### 3.5 Responsive Priority

Mobile home has this fixed reading order:

1. Introduction, with a small color portrait, complete text, status, CV, and About me action.
2. First published experience, when available.
3. Map and first social link, paired.
4. First project.
5. Experience summary and technology marquee.
6. Second project.
7. Theme switcher and music, paired.
8. Hobbies, with six permanently visible image tiles, overlaid names, and small arrow actions in three rows of two. No mobile title, subtitle, or standalone About me action.

Omit missing records without placeholders. Only two projects appear on mobile home; Projects reveals every published project. A square without its partner stays in one column. Desktop home retains its three featured projects and existing slots.

Below 768px, section views render only matching cards; unrelated home cards are removed. Projects includes all projects, and Experience starts with the summary followed by every published experience. Tablet and desktop retain unrelated home cards as muted background content. Section navigation, card CTAs, and browser Back/Forward instantly return mobile visitors to the top of the page. Section headings remain available to screen readers but are visually hidden.

Mobile About me order: introduction → map and first social link → second and third social links → hobbies → fourth and fifth social links → theme switcher and music → remaining social links in pairs. Use CMS social-link order. Keep the theme/music pair together when a preceding social pair has one available record.

---

## 4. Card System

The card is the fundamental unit of the design. All content lives inside a `Card` component with variant-specific composition.

### 4.1 Base Card

```tsx
<Card className="size-full min-h-0 min-w-0 overflow-hidden bg-card rounded-4xl">
```

| Property   | Value                        | Notes                                                                     |
| ---------- | ---------------------------- | ------------------------------------------------------------------------- |
| Background | `bg-card`                    | Uses `--card` token                                                       |
| Radius     | `rounded-4xl` (2rem)         | Overrides Card's default `rounded-xl`                                     |
| Border     | Subtle or none               | Light: `border` (default). Dark: consider `border-border/50` for subtlety |
| Shadow     | `shadow-none` to `shadow-sm` | Minimal — cards float via surface contrast                                |
| Overflow   | `overflow-hidden`            | Clips children to rounded corners                                         |
| Min sizing | `min-h-0 min-w-0`            | Required for react-grid-layout                                            |

### 4.2 Category Variants

`GridItem.variant` describes navigation membership. Its only values are `about`, `project`, and `experience`. All inner Cards use zero padding; content components own their internal spacing.

| Variant      | Content                                                    | Container                                      |
| ------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| `about`      | Profile, map, music, hobbies, social links, theme switcher | Content-specific classes via `cardClassName`   |
| `project`    | Project content                                            | `@container/project-card @container-[size]`    |
| `experience` | Role, company, dates, description, skills                  | `@container/experience-card @container-[size]` |

Use `className` for the outer grid item and `cardClassName` for the inner Card. Map, music, and hobby group/container classes belong to their callers, not new navigation variants.

`GridItem.sizing="natural"` uses automatic height and inline-size containment for mobile reading cards. Fixed bento cards and the music square retain size containment. Do not apply size containment to a card whose height must come from its contents. Grab cursors require `draggable`; dragging also requires the desktop grid breakpoint and a fine, hover-capable pointer.

### 4.3 Internal Spacing

| Zone                             | Value                    | Notes                         |
| -------------------------------- | ------------------------ | ----------------------------- |
| Card outer padding               | `py-6` (24px top/bottom) | Non-map variants              |
| Header/Content/Footer horizontal | `px-6` (24px left/right) | Via shadcn Card subcomponents |
| Content gap                      | `gap-6` (24px)           | Default Card flex gap         |
| Between title and description    | `gap-2` (8px)            | Via CardHeader grid           |

### 4.4 Interactive States

| State            | Treatment                                  | Reference                |
| ---------------- | ------------------------------------------ | ------------------------ |
| Hover            | Subtle border shift to `border-primary/30` | Soft glow, not jarring   |
| Focus (keyboard) | `ring-2 ring-ring ring-offset-2`           | WCAG 2.4.7 focus visible |
| Active/pressed   | `scale-[0.99]` via transition              | Micro-feedback           |
| Disabled         | `opacity-60 pointer-events-none`           | Standard pattern         |

Hover animation timing: `transition-colors duration-200 ease-out`. See `AGENTS-ANIMATIONS.md` for the full timing table.

---

## 5. Navigation — Pill Navbar

The navigation is a floating pill-shaped bar anchored at the top-center of the viewport.

### 5.1 Shape & Structure

```
┌──────────────────────────────────────────────────┐
│  [●All]    About me    Projects    Experience     │
└──────────────────────────────────────────────────┘
       ↑ active indicator (sliding pill)
```

| Property             | Value                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| Container shape      | `rounded-full` (pill)                                                  |
| Container background | Light: `bg-secondary` — Dark: `bg-card` with `border border-border/50` |
| Container height     | `h-12` to `h-14` (48–56px) — NOT the current `h-32`                    |
| Horizontal padding   | `px-2`                                                                 |
| Item padding         | `px-4 py-2`                                                            |
| Item font            | `text-sm font-medium`                                                  |

### 5.2 Active Indicator

A colored pill that slides behind the active nav item, animated with Motion's `layoutId`:

```tsx
{
	isActive && (
		<motion.span
			layoutId="nav-indicator"
			className="bg-primary absolute inset-0 rounded-full"
			transition={{ type: 'spring', stiffness: 350, damping: 30 }}
		/>
	);
}
```

| Property         | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Background       | `bg-primary` (vermilion in both themes)                                    |
| Text on active   | `text-primary-foreground`                                                  |
| Text on inactive | `text-muted-foreground`                                                    |
| Animation        | `layoutId` spring transition (see `AGENTS-ANIMATIONS.md` for Motion rules) |

### 5.3 Theme Toggle

Do not place the theme toggle in the navbar. Use `BB8ThemeSwitcher` in portfolio grid slot `i`, where it has enough space for the full BB-8 interaction.

### 5.4 Placement & Responsiveness

| Breakpoint  | Placement                   | Adaptation                                     |
| ----------- | --------------------------- | ---------------------------------------------- |
| `lg` / `md` | Top-center, fixed or sticky | Full labels + icons                            |
| `sm`        | Bottom-center, fixed        | Icons only — active item expands to show label |

Mobile keeps the 28px logo and Contact action in one compact top row. The section pill is fixed bottom-center, 16px above `env(safe-area-inset-bottom)`, with 44px minimum targets and a visible active label. Reserve `6rem + env(safe-area-inset-bottom)` after the grid to prevent overlap. Tablet and desktop retain the centered top navigation.

Keep focus on the navigation button during section changes. If a card CTA disappears after navigation, focus the section heading without scrolling it into view. Hover must not be required to discover content or actions: mobile hobby images, names, and arrows are always visible. Technology icons use configured colors by default on mobile, without pills or visible names; their 44px slots and animation duration match desktop. Marquee movement stops for keyboard focus, while focus retained after a pointer or touch activation must not stop it. Hover pausing requires a viewport of at least 768px and a fine pointer. Mobile social cards are full-card links without separate arrow buttons. The map has no added location label, and its story opens in a dialog outside its small square, with 20px heading and 14px body text. Use `MapMarker.asButton` for the story trigger so keyboard activation and dialog focus restoration work through a native button.

---

## 6. Typography

Type scale designed for card-constrained layouts where space is limited.

### 6.1 Type Scale

| Role              | Classes                                | Use                                               |
| ----------------- | -------------------------------------- | ------------------------------------------------- |
| Page heading      | `text-2xl font-bold tracking-tight`    | User's name (only element outside card hierarchy) |
| Card title        | `text-base font-semibold leading-none` | CardTitle (shadcn default)                        |
| Card title (hero) | `text-lg font-semibold tracking-tight` | Larger cards (hero, wide)                         |
| Card description  | `text-sm text-muted-foreground`        | CardDescription (shadcn default)                  |
| Body text         | `text-sm`                              | In-card body content                              |
| Metadata          | `text-xs text-muted-foreground`        | Dates, counts, secondary info                     |
| Code / technical  | `font-mono text-xs`                    | Tech stack tags, code references                  |

### 6.2 Letter Spacing

| Element                  | Class            | Value    |
| ------------------------ | ---------------- | -------- |
| Page heading             | `tracking-tight` | -0.025em |
| Card titles (hero)       | `tracking-tight` | -0.025em |
| Card titles (standard)   | default          | 0        |
| Body & metadata          | default          | 0        |
| All-caps labels (if any) | `tracking-wide`  | +0.025em |

### 6.3 Truncation & Clamping

For card descriptions that may overflow:

```tsx
<p className="text-muted-foreground line-clamp-2 text-sm">{description}</p>
```

| Card size   | Line clamp              |
| ----------- | ----------------------- |
| compact     | `line-clamp-1`          |
| standard    | `line-clamp-2`          |
| wide        | `line-clamp-3`          |
| tall / hero | No clamp (content fits) |

---

## 7. Iconography & Media

### 7.1 Icon Sizing

| Context              | Size class            | Pixels  | Example                 |
| -------------------- | --------------------- | ------- | ----------------------- |
| Inline with text     | `size-4`              | 16px    | Status icon, metadata   |
| Standalone button    | `size-5`              | 20px    | External link, GitHub   |
| Primary action / nav | `size-5` to `size-6`  | 20–24px | Nav icons, theme toggle |
| Hero / decorative    | `size-8` to `size-10` | 32–40px | Card accent icon        |

### 7.2 Icon Libraries

| Library         | Use                                         | Import                                   |
| --------------- | ------------------------------------------- | ---------------------------------------- |
| **Lucide**      | UI actions (arrows, edit, trash, etc.)      | `lucide-react`                           |
| **react-icons** | Brand logos (GitHub, LinkedIn, tech stacks) | `react-icons/fa`, `react-icons/ri`, etc. |

Decorative icons use `aria-hidden="true"`. Functional icons in icon-only buttons need `aria-label` on the button (see `AGENTS-ACCESSIBILITY.md`).

### 7.3 Profile Image

| Property  | Value                                                    |
| --------- | -------------------------------------------------------- |
| Component | `next/image`                                             |
| Shape     | `rounded-2xl` or `rounded-full`                          |
| Size      | Constrained by card — `max-w-full h-auto object-contain` |
| Alt text  | Descriptive: `"Gonzalo Pozo, Full Stack Developer"`      |

### 7.4 Map Card

Full-bleed treatment — the map fills the entire card:

```tsx
<GridItem variant="about" cardClassName="group/map" ...>
  <Map center={...} zoom={13} attributionControl={false}>
    <MapControls />
  </Map>
</GridItem>
```

The Card applies `p-0` and `overflow-hidden` clips the map to `rounded-4xl`. `cardClassName="group/map"` preserves map-specific group styles while its category remains `about`.

---

## 8. Interactive Patterns

### 8.1 Link & Button Treatment

| Element              | Pattern                                                                               | Notes                                    |
| -------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| External link (icon) | `text-muted-foreground hover:text-primary transition-colors`                          | Replaces hardcoded `hover:text-blue-600` |
| CTA button           | `bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed` | Default shadcn Button                    |
| Quiet selection      | `bg-accent text-accent-foreground`                                                    | Menus and admin navigation               |
| Ghost button         | `hover:bg-secondary hover:text-secondary-foreground`                                  | Low-emphasis, in-card actions            |
| Icon button          | `rounded-2xl` with `size="icon"`                                                      | GitHub, external link icons              |

### 8.2 Card-Level vs Element-Level Click Areas

- **Navigational cards** (e.g., "See more projects"): the entire card is the click target. Use a wrapping `<a>` or button with `absolute inset-0`.
- **Content cards** with multiple actions (repo link, live link, "show more"): individual clickable elements. No card-level click.

### 8.3 External Link Pattern

Replace the current `IconContext.Provider` approach with explicit token-based styling:

```tsx
<a
	href={url}
	target="_blank"
	rel="noopener noreferrer"
	className="text-muted-foreground hover:text-primary transition-colors"
	aria-label="View repository on GitHub"
>
	<FaGithub className="size-5" aria-hidden="true" />
</a>
```

### 8.4 Theme Toggle in Grid

Use `BB8ThemeSwitcher` inside the existing portfolio grid item with key `i`. Keep the switcher centered in the card:

- Full-card centering
- No visible explanatory copy
- Accessible switch semantics and focus state

---

## 9. Responsive Behavior

### 9.1 Breakpoint Summary

| Breakpoint     | Grid cols | Nav placement | Cards visible          |
| -------------- | --------- | ------------- | ---------------------- |
| `lg` (≥ 996px) | 8         | Top-center    | All                    |
| `md` (≥ 768px) | 4         | Top-center    | All (rearranged)       |
| `sm` (< 768px) | 1         | Bottom-center | Priority subset (§3.5) |

### 9.2 Content Priority at Narrow Widths

At `sm`, the grid becomes a single column. Content ordering:

1. About card (always first)
2. Featured project(s) (1–2 max)
3. Contact card
4. Additional content (collapsed or hidden)
5. Map card (last or hidden)

### 9.3 Touch Targets

Per WCAG 2.5.8 and `AGENTS-ACCESSIBILITY.md`:

- Minimum touch target: **44 × 44px**
- Nav items: `min-h-11` (44px) ensures compliance
- Icon buttons: `size="icon"` (40 × 40px default) — add `min-w-11 min-h-11` if used as primary actions
- Card "Show more" buttons: standard Button size (≥ 44px height)

### 9.4 Nav Adaptation

- The header pill contains `All`, `About me`, `Projects`, and `Experience`; the active item expands to show its label.
- The separate Contact button opens `mailto:pozosanchezgonzalo@gmail.com`. The theme switcher remains in the grid.
- Navigation uses `?section=` and browser history. All restores the home highlights; category views prepend matching cards and reveal remaining records, with other home cards visually muted but usable.
- Desktop dragging is available in every view, with arrangements remembered independently per section and breakpoint during the current session. Respect reduced motion for entry, exit, and position transitions.

---

## Verification Checklist

When applying or modifying this design system:

- [ ] All text-on-surface combinations meet WCAG AA contrast (4.5:1 normal, 3:1 large) — use WebAIM Contrast Checker
- [ ] `muted-foreground` on `background` meets 4.5:1 in both themes
- [ ] `primary` as text on `card` meets 4.5:1 in both themes
- [ ] Cards visually separate from background in both themes (surface contrast)
- [ ] No hardcoded colors remain — all use design tokens
- [ ] Status colors use `text-status-*` instead of `text-green-600` etc.
- [ ] External link hover uses `hover:text-primary` instead of `hover:text-blue-600`
- [ ] Grid card radius is consistently `rounded-4xl`
- [ ] Navbar height is `h-12` to `h-14`, not `h-32`
- [ ] Run `AGENTS-ACCESSIBILITY.md` pre-production audit after visual changes
