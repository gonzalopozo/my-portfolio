# AGENTS.md

Personal portfolio with a public page and an admin dashboard (CMS) — built with Next.js 16, React 19, TypeScript, Tailwind CSS 4.2, Drizzle ORM, Turso, and better-auth.

## Package Manager

**Always use pnpm.** Never use npm, npx, or yarn. Use `pnpm dlx` instead of `npx`.

## Commands

| Command         | Description                       |
| --------------- | --------------------------------- |
| `pnpm dev`      | Start dev server (Turbopack)      |
| `pnpm build`    | Production build                  |
| `pnpm lint`     | ESLint                            |
| `pnpm db:setup` | Local-only generate + schema push |
| `pnpm start`    | Start production server           |
| `pnpm test`     | Vitest (watch mode)               |

## Git Rules

- Do not work directly on `main` for feature work.
- Use small feature branches.
- Keep commits focused.
- Do not mix unrelated changes.
- Do not add generated files unless required.
- Do not add dependencies without explaining why.
- When asked to commit changes, choose a clear commit message yourself and use the convention below.

## Commit Convention

Use Conventional Commits: `<type>(<scope>): <imperative summary>`.

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Recommended scopes: `public`, `admin`, `api`, `auth`, `db`, `actions`, `queries`, `schema`, `ui`, `design`, `config`, `docs`, `tests`.

Examples:

```txt
feat(public): add project gallery filtering
fix(auth): validate missing session state
docs(agents): define commit convention
```

Rules:

- Use imperative mood: `add`, `fix`, `remove`, `update`.
- Keep the summary short and specific.
- Avoid vague commits like `update`, `changes`, `fix stuff`, or `wip`.
- Use `BREAKING CHANGE:` in the body/footer for incompatible changes.

## Pre-Commit Checks

**Run checks only when the user explicitly asks the agent to commit. If the user
has not requested a commit, do not run any checks.** This includes formatting,
linting, type checking, tests, spellchecking, unused-code analysis, dependency
boundary validation, builds, and verification commands from other guides or skills.
Do not run checks during routine implementation or automatically after edits.

Once the user requests a commit, before creating it, run a dedicated Codex subagent with model `gpt-6-luna`,
reasoning effort `low`, and Fast Mode enabled. The subagent performs the final
verification pass and must report every command it ran, every finding, and whether the
commit is blocked.

The pre-commit subagent must complete these checks:

1. Inspect the intended commit diff with `git status --short` and `git diff --check`.
   Confirm that only related files are included, no generated files are staged unless
   required, and there are no whitespace errors.
2. Run `pnpm format:check` to verify Prettier formatting.
3. Run `pnpm lint` to verify ESLint, React Compiler, Next.js, Tailwind, and TypeScript
   lint rules.
4. Run `pnpm exec tsc --noEmit` to verify TypeScript compilation without writing
   generated output.
5. Run `pnpm exec vitest run` to execute the test suite once in non-watch mode.
6. Run `pnpm spellcheck` to catch spelling regressions in user-facing text,
   documentation, and code identifiers covered by cspell.
7. Run `pnpm knip` to detect unused files, exports, and dependencies.
8. Run `pnpm depcruise` to validate dependency boundaries and architectural rules.
9. Run `pnpm build` as the final check before the commit. Because this command is
   slow, only run `pnpm build` during this pre-commit phase, not during routine
   implementation work.

If any pre-commit check returns errors or warnings, fix them before creating the
commit. Treat warnings as blockers unless they are explicitly confirmed to be
false positives and documented in the commit notes.

## Automated CI and local verification

GitHub Actions runs validation automatically after pull requests and pushes. This
does not authorize agents to run local checks. The pre-commit policy above,
including the dedicated subagent and all required checks, remains unchanged.
Implementation approval alone is not a request to commit. See [CI/CD](./AGENTS-CICD.md).

## Tech Stack

| Category   | Technology                                         |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js 16, App Router, React Compiler             |
| Language   | TypeScript (strict)                                |
| Styling    | Tailwind CSS 4.2, tw-animate-css                   |
| Database   | Turso (libSQL) via Drizzle ORM                     |
| Auth       | better-auth (email/password, sign-up disabled)     |
| UI         | shadcn/ui, Lucide icons, react-icons, cmdk, sonner |
| Animations | Motion, @number-flow/react, tw-animate-css         |

## Project Structure

```
app/
├── (admin)/          # Dashboard + login (protected)
├── (public)/         # Portfolio page (public)
├── api/              # Auth routes (better-auth)
└── # Each route group owns its root layout (shared AppDocument)
components/
├── admin/            # Dashboard components
├── auth/             # Auth components
├── public/           # Public portfolio components
└── ui/               # shadcn/ui components
agent-instructions/  # Task-specific implementation briefs for agents
db/schema/            # Drizzle schema (source of truth for DB structure)
lib/
├── actions/          # Server Actions
├── queries/          # Data access facade (read queries)
├── schemas/          # Zod validation schemas
├── auth.ts           # better-auth config
├── auth-client.ts    # better-auth client
├── server-session.ts # Session helper
├── types.d.ts        # Ambient / shared types
└── utils.ts          # Shared utilities (cn, formatDate, etc.)
```

## Naming Conventions

- **Files**: kebab-case (`social-links.ts`)
- **Components**: PascalCase (`SkillsMultiSelect`)
- **Functions/Variables**: camelCase (`createProject`)
- **Database columns**: snake_case (Drizzle casing config)

## Agent Instruction Briefs

- Store task-specific implementation briefs in `agent-instructions/`.
- Name each brief descriptively in kebab-case (for example,
  `improve-about-me-button-hover.md`).
- Each brief must define the objective, relevant context, required behavior,
  constraints, acceptance criteria, and verification commands.
- When a task references a brief, read it before making implementation changes.
- Ignore `.specstory` entirely: do not read it for context and do not write new
  files there. Treat it as legacy content outside the agent workflow.

## Knowledge Resolution Order

1. The referenced brief in `agent-instructions/`, when applicable
2. This file + `AGENTS-*.md` sub-files
3. Agent Skills (`.claude/skills/`)
4. Web search (last resort)

## Common Tasks

> **Before adding a new entity, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/drizzle-orm/SKILL.md`

**Add a new entity**: schema in `db/schema/` → `pnpm db:setup` → actions in `lib/actions/` → Zod schema in `lib/schemas/` → query in `lib/queries/` → dashboard page → public page.

> **Before adding a UI component, execute the following skills** — read each SKILL.md and follow its instructions:
>
> 1. `.claude/skills/shadcn/SKILL.md`
> 2. `.claude/skills/frontend-design/SKILL.md`
> 3. `.claude/skills/tailwind-design-system/SKILL.md`
> 4. `AGENTS-DESIGN.md` (design tokens, grid vocabulary, card variants)

**Add a UI component**: add in `components/ui/` using Radix primitives + Tailwind + `cn()`.

## Upcoming Features

- Education section (courses, diplomas, certifications)
- Image uploads for projects/experiences

## Deep-Dive Guides

| Guide                                                | When to read                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [CI/CD](./AGENTS-CICD.md)                            | Workflows, environments, migrations, releases, operations                                              |
| [Setup](./AGENTS-SETUP.md)                           | First-time setup, env vars, prerequisites                                                              |
| [Conventions](./AGENTS-CONVENTIONS.md)               | JSDoc style, when and how to document                                                                  |
| [Patterns](./AGENTS-PATTERNS.md)                     | Architecture — Container-Presentational, Server Action hardening, Data Access Facade, Error Boundaries |
| [Patterns Reference](./AGENTS-PATTERNS-REFERENCE.md) | Full Next.js file-system conventions, detailed pattern implementations                                 |
| [Security](./AGENTS-SECURITY.md)                     | Auth, CSP, headers, input validation, CSRF, rate limiting                                              |
| [Security Reference](./AGENTS-SECURITY-REFERENCE.md) | Full proxy.ts/CSP implementation, header configs, SDK examples, audit commands                         |
| [SEO](./AGENTS-SEO.md)                               | Metadata templates, OG images, sitemap, robots                                                         |
| [Performance](./AGENTS-PERFORMANCE.md)               | React Compiler, code splitting, loading states, bundle optimization, Core Web Vitals                   |
| [Accessibility](./AGENTS-ACCESSIBILITY.md)           | Landmarks, skip link, forms, images, contrast, motion preferences                                      |
| [Animations](./AGENTS-ANIMATIONS.md)                 | Tailwind animations, Motion, NumberFlow                                                                |
| [Design](./AGENTS-DESIGN.md)                         | Theme tokens, bento grid system, card anatomy, pill navbar, typography                                 |
| [Testing](./AGENTS-TESTING.md)                       | Vitest, Playwright, mocking, CI                                                                        |
| [Testing Reference](./AGENTS-TESTING-REFERENCE.md)   | Full mock code blocks, CI workflow YAML, auth setup, axe-core patterns                                 |
