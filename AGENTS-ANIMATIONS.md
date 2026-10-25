# AGENTS-ANIMATIONS.md

Animation guidelines for the portfolio project — when and how to use the three animation layers: Tailwind CSS, Motion (Framer Motion), and NumberFlow.

**Animation libraries in this project:**

- `tw-animate-css` — Tailwind-compatible animation utilities used by shadcn/ui (fadeIn, slideIn, etc.)
- `motion` (v12+) — React animation library for layout, gestures, exit animations, orchestration
- `@number-flow/react` — Animated number component for counters and statistics

> **Before designing or implementing animations/visual polish, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/frontend-design/SKILL.md`

**Related coverage in other AGENTS files (do not duplicate):**

- `AGENTS-ACCESSIBILITY.md` > Motion Preferences — `prefers-reduced-motion` CSS
- `AGENTS-PERFORMANCE.md` > Dynamic Imports — `next/dynamic` for heavy components

---

## When to Use Each Layer

| Situation                                    | Use                                                 | Why                              |
| -------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| Spinners, pulses, simple hover effects       | **Tailwind** (`animate-*`, `transition-*`)          | Zero JS, GPU-accelerated         |
| shadcn component transitions (Dialog, Sheet) | **tw-animate-css** (built in)                       | Pre-configured, consistent       |
| Icon state changes (copy→check, like toggle) | **Motion** (`AnimatePresence`)                      | CSS can't do enter/exit cleanly  |
| Layout animations (list reorder, add/remove) | **Motion** (`layout` prop)                          | CSS can't animate FLIP           |
| Animated number counters                     | **NumberFlow**                                      | Purpose-built, accessible        |
| Page transitions                             | **Motion** or CSS View Transitions                  | Prefer CSS for simple fades      |
| Scroll-triggered animations                  | **Motion** (`useInView`) or Tailwind `motion-safe:` | Motion for complex orchestration |

### Rules

- **Default to Tailwind** — no JS overhead
- **Motion requires `"use client"`** — uses hooks and event handlers
- **NumberFlow only for numeric values**
- **Never install GSAP, anime.js, etc.** — Motion covers all needs

---

## Tailwind CSS Animations

### Built-in Utilities

| Utility          | Use                    |
| ---------------- | ---------------------- |
| `animate-spin`   | Loading spinners       |
| `animate-ping`   | Notification badges    |
| `animate-pulse`  | Skeleton loaders       |
| `animate-bounce` | Scroll-down indicators |

### Transition Pattern

```typescript
<div className="transition-transform duration-200 ease-out hover:-translate-y-0.5">
  {/* Card hover lift */}
</div>
```

### Reduced Motion

Use `motion-safe:` and `motion-reduce:` variants:

```typescript
<svg className="motion-safe:animate-spin h-5 w-5" />
```

### Custom Animations

Define in `globals.css` via `@theme` directive for reusable animations:

```css
@theme {
	--animate-wiggle: wiggle 0.3s ease-in-out;
	@keyframes wiggle {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}
}
```

Use as `animate-wiggle`. Prefer this over inline `animate-[...]` for animations used more than once.

---

## Motion (Framer Motion)

Import from `motion/react` (not `framer-motion` — package renamed):

```typescript
'use client';
import { motion, AnimatePresence } from 'motion/react';
```

### Basic Animation

```typescript
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  {children}
</motion.div>
```

### Enter/Exit Animations (AnimatePresence)

Wrap items that mount/unmount to animate exits:

```typescript
<AnimatePresence mode="wait" initial={false}>
  {isCopied ? (
    <motion.div key="check"
      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
      transition={{ duration: 0.15 }}>
      <Check className="h-4 w-4" aria-hidden="true" />
    </motion.div>
  ) : (
    <motion.div key="copy" /* same animation props */>
      <Copy className="h-4 w-4" aria-hidden="true" />
    </motion.div>
  )}
</AnimatePresence>
```

### Layout Animations

Use `layout` prop for automatic FLIP when size/position changes:

```typescript
<motion.ul layout>
  <AnimatePresence>
    {items.map((item) => (
      <motion.li key={item.id} layout
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}>
        {item.title}
      </motion.li>
    ))}
  </AnimatePresence>
</motion.ul>
```

### Key Concepts

| Concept                        | What It Does                        | When to Use                      |
| ------------------------------ | ----------------------------------- | -------------------------------- |
| `initial` / `animate` / `exit` | Mount/unmount states                | Entrance/exit animations         |
| `transition`                   | Duration, easing, spring config     | Fine-tune any animation          |
| `layout` / `layoutId`          | FLIP layout animations              | List reorder, shared transitions |
| `AnimatePresence`              | Keeps children until exit completes | Anything that mounts/unmounts    |
| `whileHover` / `whileTap`      | Hover/press animations              | Interactive elements             |
| `useInView` / `useScroll`      | Viewport/scroll tracking            | Scroll-triggered animations      |

### With Server Components

Motion components must be Client Components. Wrap only the animated part:

```typescript
// components/animated-section.tsx — "use client"
<motion.section
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.4 }}>
  {children}
</motion.section>

// Server Component imports and passes children as props
```

---

## NumberFlow

Smooth animated transitions between numeric values. Accessible by default (`respectMotionPreference: true`).

```typescript
"use client";
import NumberFlow from "@number-flow/react";

<NumberFlow value={count} locales="en-US" className="text-3xl font-bold tabular-nums" />

// With formatting
<NumberFlow value={price} format={{ style: "currency", currency: "USD" }} />
<NumberFlow value={pct} format={{ style: "percent", minimumFractionDigits: 1 }} />
<NumberFlow value={total} suffix=" projects" />
```

### Where to Use

| Location                       | Value                          | Format           |
| ------------------------------ | ------------------------------ | ---------------- |
| Dashboard overview stats       | Project/experience/skill count | Integer          |
| Public page (if showing stats) | Years of experience            | Integer + suffix |

### Rules

- **Always `"use client"`** — uses browser APIs
- **Use `tabular-nums` class** — prevents layout shift during transitions
- **Set `locales` explicitly** — consistent formatting
- **Do NOT set `respectMotionPreference: false`** — respects reduced motion by default

---

## Animation Performance

### Animate Only Composite Properties (GPU-accelerated)

| Safe (GPU)                             | Avoid (triggers layout)          |
| -------------------------------------- | -------------------------------- |
| `transform` (translate, scale, rotate) | `width`, `height`                |
| `opacity`                              | `top`, `right`, `bottom`, `left` |
| `filter` (blur, brightness)            | `margin`, `padding`              |
| `clip-path`                            | `border-width`, `font-size`      |

### Rules

- **`will-change`** — only on elements that animate frequently; too many wastes GPU memory. Motion handles it internally for its animated properties
- **Keep Motion out of pages that don't need it** — dynamically import animated components if only used on specific pages
- **All animations must maintain 60fps** — test on throttled CPU (Chrome DevTools > Performance > 4x slowdown)

---

## Animation UX Guidelines

### Timing

| Type                                        | Duration  | Easing               |
| ------------------------------------------- | --------- | -------------------- |
| Micro-interaction (button press, icon swap) | 100-200ms | `ease-out`           |
| Enter/appear                                | 200-300ms | `ease-out`           |
| Exit/disappear                              | 150-250ms | `ease-in`            |
| Layout change (reorder, resize)             | 200-400ms | `ease-in-out`        |
| Page transition                             | 300-500ms | `ease-in-out`        |
| Number transition                           | 300-750ms | spring or `ease-out` |

### Easing Rule of Thumb

- **Enters** → `ease-out`
- **Leaves** → `ease-in`
- **Moves while staying** → `ease-in-out`
- **Never stops** (spinners) → `linear`

### Do's and Don'ts

- Animate to provide **feedback** or **guide attention** — every animation needs a purpose
- Keep durations **short** — users see them hundreds of times
- Use `AnimatePresence` for exits — elements shouldn't just vanish
- Use `viewport={{ once: true }}` for scroll-triggered animations
- **Don't** animate for decoration only
- **Don't** use bouncy springs for frequent/repetitive actions
- **Don't** animate more than 2-3 elements simultaneously
- **Don't** add entrance animations to admin data tables (too frequent)
- **Don't** use `animate-spin` on anything except loading indicators
