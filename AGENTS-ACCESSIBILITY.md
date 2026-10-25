# AGENTS-ACCESSIBILITY.md

Accessibility guidelines for the portfolio project — project-specific patterns using Next.js 16, shadcn/ui, Tailwind CSS 4.2, and Sonner.

> **Before auditing or fixing accessibility, execute the following skills** — read each SKILL.md and follow its instructions:
>
> 1. `.claude/skills/accessibility-compliance/SKILL.md`
> 2. `.claude/skills/wcag-audit-patterns/SKILL.md`

> **Before building or modifying shadcn/ui components with a11y requirements, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/shadcn/SKILL.md`

---

## Next.js Components over HTML

**Always use Next.js components instead of HTML equivalents** — they provide built-in optimizations and accessibility.

| HTML                 | Next.js Component | Import             | Why                                                          |
| -------------------- | ----------------- | ------------------ | ------------------------------------------------------------ |
| `<a>`                | `<Link>`          | `next/link`        | Client-side nav, prefetching, accessible by default          |
| `<form>`             | `<Form>`          | `next/form`        | Prefetches loading UI, progressive enhancement               |
| `<img>`              | `<Image>`         | `next/image`       | Lazy loading, responsive srcset, enforces `alt` + dimensions |
| Manual font `<link>` | `next/font`       | `next/font/google` | Self-hosted, zero layout shift                               |
| `<script>`           | `<Script>`        | `next/script`      | Loading strategies, avoids blocking                          |

### Rules

- **Never use `<a>` for internal links** — use `<Link>` (renders `<a>` with prefetching)
- **Never use `<img>`** — use `<Image>` which requires `alt`, `width`, `height` (or `fill`)
- **Never load fonts via `<link>` tags** — use `next/font` for self-hosting
- **Use `<Form>` from `next/form` for navigation forms** (search, filters); regular `<form>` with `action` is fine for Server Action mutations

---

## Semantic Layout Structure

The public portfolio page must use semantic HTML landmarks in `(public)/layout.tsx`:

```typescript
<>
  <SkipLink />
  <header>
    <nav aria-label="Main navigation">{/* Links */}</nav>
  </header>
  <main id="main-content" tabIndex={-1}>
    {children}
  </main>
  <footer>
    <nav aria-label="Social links">{/* Links */}</nav>
  </footer>
</>
```

### Rules

- Exactly **one `<main>`** per page
- `<nav>` needs `aria-label` when multiple navs exist on the same page
- Use `<section aria-labelledby="heading-id">` for major content sections (projects, experiences, skills)
- Admin dashboard uses shadcn `Sidebar` which handles landmarks via Radix

### Section Pattern

```typescript
<section aria-labelledby="projects-heading">
  <h2 id="projects-heading">Projects</h2>
  {/* Cards */}
</section>
```

---

## Skip Link

Required for WCAG 2.4.1 (Bypass Blocks). Place as first child inside `<body>` or public layout.

```typescript
// components/skip-link.tsx
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
```

The `<main>` element must have `id="main-content"` and `tabIndex={-1}` to receive focus.

---

## shadcn Component Accessibility Notes

### Icon Buttons Need `aria-label`

```typescript
// Icon-only button — MUST have aria-label
<Button variant="ghost" size="icon" aria-label="Delete project">
  <Trash2 className="h-4 w-4" aria-hidden="true" />
</Button>
```

### Dialog — Auto-Accessible

shadcn `Dialog` (Radix) automatically traps focus, returns focus on close, closes on Escape. **Always include `DialogTitle` and `DialogDescription`** — Radix uses them for `aria-labelledby`/`aria-describedby`. Hide description visually with `sr-only` if needed.

### Table — Add `scope` and `caption`

```typescript
<Table>
  <TableCaption>Portfolio projects managed from the dashboard</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Title</TableHead>
      <TableHead scope="col">Status</TableHead>
      <TableHead scope="col">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {projects.map((p) => (
      <TableRow key={p.id}>
        <TableCell>{p.title}</TableCell>
        <TableCell>{p.status}</TableCell>
        <TableCell>
          <Button variant="ghost" size="icon" aria-label={`Edit ${p.title}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Select, DropdownMenu, Tabs

Auto-accessible via Radix. Just ensure: `Select` has a visible label (or `aria-label`), `DropdownMenu` trigger has a descriptive name, `Tabs` content is associated automatically.

---

## Accessible Forms

Every form field must have: (1) visible `<Label>`, (2) error messages via `aria-describedby`, (3) `aria-invalid` on error, (4) `aria-required` for required fields.

shadcn's `FormField` + `FormLabel` + `FormMessage` handles this automatically with React Hook Form. Add `aria-required="true"` on required inputs.

### Required Field Indication

```typescript
<FormLabel>
  Project Title <span aria-label="required" className="text-destructive">*</span>
</FormLabel>
```

### Rules

- **Never use toasts as the only error feedback** — show inline errors via `FormMessage` first; toasts are supplementary
- **Toast messages must convey meaning via text** — screen readers can't see icon colors

---

## Sonner Toasts

Sonner handles ARIA live regions automatically:

- Success/info toasts: `aria-live="polite"` (non-interrupting)
- Error toasts: `role="alert"` (interrupting)
- Keyboard-dismissible

**Rules**: Always provide descriptive text messages. Keep to 1-2 sentences.

---

## Accessible Images

Always use `next/image` which enforces `alt` at the TypeScript level.

| Image Type         | Alt Text                                                          |
| ------------------ | ----------------------------------------------------------------- |
| Project screenshot | Describe what it shows: `"Dashboard view of task management app"` |
| Company logo       | Company name: `"Vercel logo"`                                     |
| Decorative         | `alt="" aria-hidden="true"`                                       |
| Profile photo      | `"Gonzalo Pozo, Full Stack Developer"`                            |

### Rules

- **Informative images need meaningful alt text** — TypeScript enforces the prop exists but not the value
- **Decorative images**: `alt=""` + `aria-hidden="true"`
- **Complex images**: use `<figure>` + `<figcaption>` + `aria-describedby`

---

## Motion Preferences

Add to `app/globals.css` to disable animations for users who prefer reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}
}

@media (prefers-reduced-motion: no-preference) {
	html {
		scroll-behavior: smooth;
	}
}
```

For Windows High Contrast mode, ensure focus uses `outline` not `box-shadow`:

```css
@media (forced-colors: active) {
	:focus-visible {
		outline: 2px solid CanvasText;
		outline-offset: 2px;
	}
}
```

---

## Color Contrast

### WCAG AA Thresholds

| Element                                     | Minimum Ratio |
| ------------------------------------------- | ------------- |
| Normal text (< 18px or < 14px bold)         | 4.5:1         |
| Large text (>= 18px or >= 14px bold)        | 3:1           |
| UI components (borders, icons, focus rings) | 3:1           |

### Rules

- **Never use `outline: none` without a replacement** — keyboard users need visible focus indicators
- **Verify `muted-foreground`** meets 4.5:1 against background when customizing the theme
- **Destructive actions**: red is not the only indicator — always include text like "Delete" alongside color
- **Use WebAIM Contrast Checker** or DevTools when changing theme colors

---

## Responsive Accessibility

### Mobile Navigation

Hamburger menus need these a11y attributes:

```typescript
<Button
  aria-expanded={isOpen}
  aria-controls="mobile-menu"
  aria-label={isOpen ? "Close menu" : "Open menu"}
  className="md:hidden"
>
  {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
</Button>

{isOpen && <ul id="mobile-menu">{/* links */}</ul>}
```

### Reflow (WCAG 1.4.10)

- Usable at 320px viewport width (400% zoom on 1280px)
- No horizontal scrolling for text content
- Touch targets at least 44x44px (WCAG 2.5.8)

---

## Heading Hierarchy

### Public Page

```
h1: "Gonzalo Pozo" (one per page)
  h2: "Projects"
    h3: Project titles
  h2: "Experience"
    h3: Role @ Company
  h2: "Skills"
  h2: "Contact" / "Social Links"
```

### Rules

- **Exactly one `<h1>` per page**
- **Never skip heading levels** — no `<h1>` → `<h3>`
- **Headings describe content** — not decorative
- DialogTitle renders as `<h2>` inside dialogs — correct and accessible

---

## Route Announcements

Next.js has a built-in route announcer for client-side navigation. It announces page changes using: `document.title` → `<h1>` → URL pathname (in that order). Ensure every page has a unique `<title>` (via `metadata` export) and an `<h1>`.

---

## ESLint Accessibility

Next.js includes `eslint-plugin-jsx-a11y` by default. Run `pnpm lint` to catch: missing `alt`, invalid ARIA attributes, missing required ARIA props. **Do not disable jsx-a11y rules** — fix the underlying issue instead.

---

## Pre-Production Audit

### Lighthouse

Run before every deployment: `pnpm build && pnpm start`, then Chrome Incognito > DevTools > Lighthouse > Accessibility. **Target: >= 90** for the public page.

### Manual Testing Checklist

- [ ] Keyboard-only: Tab through entire page, all interactive elements reachable
- [ ] Skip link: Tab once → "Skip to main content" appears and works
- [ ] Focus visible: every focused element has visible outline/ring
- [ ] Screen reader: VoiceOver (Cmd+F5) — headings, landmarks, links announced correctly
- [ ] Zoom: usable at 200% and 400% without horizontal scrolling
- [ ] Reduced motion: enable "Reduce motion" in OS → no animations play
- [ ] Color contrast: no text below 4.5:1 ratio
- [ ] Alt text: every `<Image>` has meaningful alt (or `alt=""` for decorative)
- [ ] Form labels: every input has a visible label
- [ ] Error messages: announced to screen readers, linked to fields
- [ ] Dialog: traps focus, closes on Escape, returns focus to trigger
