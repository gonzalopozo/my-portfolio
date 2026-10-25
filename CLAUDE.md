# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal portfolio with a public page and an admin dashboard (CMS) — Next.js 16, React 19, TypeScript, Tailwind CSS 4.2, Drizzle ORM, Turso, better-auth.

## Package Manager

**Always use pnpm.** Never use npm, npx, or yarn. Use `pnpm dlx` instead of `npx`.

## Commands

| Command              | Description             |
| -------------------- | ----------------------- |
| `pnpm dev`           | Dev server (Turbopack)  |
| `pnpm build`         | Production build        |
| `pnpm lint`          | ESLint                  |
| `pnpm lint:fix`      | ESLint --fix            |
| `pnpm format`        | Prettier --write        |
| `pnpm format:check`  | Prettier --check        |
| `pnpm spellcheck`    | CSpell                  |
| `pnpm test`          | Vitest (watch)          |
| `pnpm test -- --run` | Vitest (single run)     |
| `pnpm db:setup`      | Drizzle generate + push |
| `pnpm knip`          | Detect unused exports   |

## Command Restrictions

Agents must never run `pnpm build`, `pnpm lint`, `pnpm lint:fix`, `pnpm format`,
`pnpm format:check`, Prettier, ESLint, or formatter/linter/build commands. Leave
those checks to the user and only mention them as suggested verification steps.

## Naming Conventions

- **Files**: kebab-case (`social-links.ts`)
- **Components**: PascalCase (`SkillsMultiSelect`)
- **Functions/Variables**: camelCase (`createProject`)
- **Database columns**: snake_case (Drizzle casing config)

## Code Style

- Tabs (width 4), single quotes, JSX double quotes, trailing commas, print width 100
- No `console.log` in `app/` and `components/` (`console.warn`/`console.error` OK)
- React Compiler is enabled — never use `useMemo`, `useCallback`, or `React.memo`
- ESLint flat config (`eslint.config.mts`) with React Compiler plugin at error level
- Tailwind class linting and autofix live in `eslint-plugin-better-tailwindcss`

## Architecture Patterns

1. **Container-Presentational**: pages call `getServerSession()` + query data → pass to presentational components
2. **Server Action Hardening**: authenticate → validate (Zod `.safeParse()`) → execute (try-catch) → `revalidatePath()`
3. **Data Access Facade**: all reads through `lib/queries/` (one file per entity)
4. **Error Boundaries**: `error.tsx` and `loading.tsx` per route segment

## Security

- Two-layer auth: optimistic redirect via `proxy.ts` (UX only) + real auth in pages/actions via `getServerSession()`
- Server Actions must validate input with Zod `.safeParse()` before any DB operation
- Never prefix secrets with `NEXT_PUBLIC_`
- CSP with nonces configured in proxy.ts

## Git Conventions

- Conventional Commits enforced via commitlint (`feat:`, `fix:`, `build:`, `docs:`, `perf:`, etc.)
- Pre-commit hook: lint-staged runs ESLint → Prettier → CSpell
- After cloning: run `pnpm run hooks:install` to set up Husky

## Adding Entities

Schema in `db/schema/` → `pnpm db:setup` → actions in `lib/actions/` → Zod schema in `lib/schemas/` → query in `lib/queries/` → dashboard page → public page.

## UI Components

Add in `components/ui/` using Radix primitives + Tailwind + `cn()`. Follow the design system in AGENTS-DESIGN.md for theme tokens, grid vocabulary, and card variants.

## Testing

- TDD for: Zod schemas, utility functions, Server Action logic
- Test-after for: junction table sync, client components, pages, auth flows
- Vitest with jsdom for unit tests (`tests/`), Playwright for E2E (`e2e/`)
- Use `vi.mock()` at module level, `vi.mocked()` for type-safe access

## Deep-Dive Guides

Read these files when working on related topics:

| Guide                        | When to read                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| AGENTS-SETUP.md              | First-time setup, env vars, prerequisites                                            |
| AGENTS-CONVENTIONS.md        | JSDoc style, when and how to document                                                |
| AGENTS-PATTERNS.md           | Architecture — Container-Presentational, Server Action hardening, Data Access Facade |
| AGENTS-PATTERNS-REFERENCE.md | Full Next.js file-system conventions, detailed pattern implementations               |
| AGENTS-SECURITY.md           | Auth, CSP, headers, input validation, CSRF                                           |
| AGENTS-SECURITY-REFERENCE.md | Full proxy.ts/CSP implementation, header configs                                     |
| AGENTS-SEO.md                | Metadata templates, OG images, sitemap, robots                                       |
| AGENTS-PERFORMANCE.md        | React Compiler, code splitting, loading states, Core Web Vitals                      |
| AGENTS-ACCESSIBILITY.md      | Landmarks, skip link, forms, images, contrast, motion preferences                    |
| AGENTS-ANIMATIONS.md         | Tailwind animations, Motion, NumberFlow                                              |
| AGENTS-DESIGN.md             | Theme tokens (OKLCH), bento grid system, card anatomy, typography                    |
| AGENTS-TESTING.md            | Vitest, Playwright, mocking patterns, CI                                             |
| AGENTS-TESTING-REFERENCE.md  | Full mock code blocks, CI workflow YAML                                              |
