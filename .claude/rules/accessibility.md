---
description: Accessibility rules — semantic HTML, ARIA, forms, images, focus, contrast. Applies to all UI code.
globs:
    - 'components/**'
    - 'app/**/*.tsx'
---

## Accessibility Rules

### Use Next.js Components Over HTML

| HTML                  | Use Instead                   | Why                          |
| --------------------- | ----------------------------- | ---------------------------- |
| `<a>` (internal)      | `<Link>` from `next/link`     | Prefetching, client-side nav |
| `<img>`               | `<Image>` from `next/image`   | Enforces alt, lazy loading   |
| `<form>` (navigation) | `<Form>` from `next/form`     | Progressive enhancement      |
| Font `<link>`         | `next/font`                   | Zero layout shift            |
| `<script>`            | `<Script>` from `next/script` | Loading strategies           |

### Landmarks & Structure

- Exactly **one `<main>`** per page with `id="main-content"` and `tabIndex={-1}`
- `<nav>` needs `aria-label` when multiple navs exist on the same page
- Use `<section aria-labelledby="heading-id">` for major content sections
- Exactly **one `<h1>` per page** — never skip heading levels

### Skip Link

Required (WCAG 2.4.1). Place as first child in public layout. Target: `#main-content`.

### Components

- **Icon-only buttons MUST have `aria-label`** — decorative icons use `aria-hidden="true"`
- **Dialog**: always include `DialogTitle` and `DialogDescription` (Radix needs them for aria-labelledby)
- **Tables**: add `<TableCaption>` and `scope="col"` on headers

### Forms

- Every field: visible `<Label>` + `aria-describedby` for errors + `aria-invalid` on error + `aria-required`
- **Never use toasts as the only error feedback** — inline errors first, toasts supplementary
- Required fields: mark with `<span aria-label="required">*</span>`

### Images

- Informative: meaningful alt text describing content
- Decorative: `alt="" aria-hidden="true"`
- Complex: `<figure>` + `<figcaption>` + `aria-describedby`

### Color & Focus

- Normal text: 4.5:1 contrast minimum. Large text: 3:1. UI components: 3:1.
- **Never use `outline: none` without a replacement** focus indicator
- Red is not the only indicator for destructive actions — always include text

### Responsive

- Usable at 320px viewport (400% zoom)
- Touch targets: minimum 44×44px (WCAG 2.5.8)
- **Do not disable `jsx-a11y` ESLint rules** — fix the issue instead

Full guidelines and audit checklist: see AGENTS-ACCESSIBILITY.md
