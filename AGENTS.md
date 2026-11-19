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

- Format requested pull request names using this same Conventional Commits convention.
- Use imperative mood: `add`, `fix`, `remove`, `update`.
- Keep the summary short and specific.
- Avoid vague commits like `update`, `changes`, `fix stuff`, or `wip`.
- Use `BREAKING CHANGE:` in the body/footer for incompatible changes.

## Pre-Commit Checks

**Run local checks only when the user explicitly asks the agent to commit. An
explicit push request authorizes the mandatory local Playwright gate only. If
neither operation was requested, do not run any checks.** This includes formatting,
linting, type checking, tests, spellchecking, unused-code analysis, dependency
boundary validation, builds, and verification commands from other guides or skills.
Do not run checks during routine implementation or automatically after edits.
The only additional authorization is an explicit push request, which runs the
full local Playwright gate described below, including the isolated production
build/smoke and the component gallery build. It does not authorize the other checks.

Once the user requests a commit, before creating it, run a dedicated Codex subagent with model `gpt-6-luna`,
reasoning effort `low`, and Fast Mode enabled. The subagent performs the final
verification pass and must report every command it ran, every finding, and whether the
commit is blocked.

As setup for this authorized pass, the subagent must run `pnpm icons:manifest`
before the checks below. The ignored JSON is required by direct commands such as
`pnpm exec tsc --noEmit` on a fresh checkout. This preparation does not replace any
check or authorize checks outside an explicit commit request.

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

## Local browser hooks

Install Husky explicitly with `pnpm hooks:install` in every clone/worktree because
package lifecycle scripts are disabled. Pre-commit runs lint-staged. Pre-push
runs the complete isolated production suite with `pnpm test:e2e:local`. After it
passes, the hook runs `pnpm test:component:browser`. Every push needs a fresh
successful run of both phases. Keep hosted Preview acceptance local too. CircleCI
must never execute Playwright or download browsers.

The dedicated nine-check pre-commit subagent policy above remains unchanged.
Local hooks cannot prove that GitHub web/bot-created commits were tested; owner
review must arrange local browser verification before accepting those changes.

## Automated CI and local verification

CircleCI runs browser-free validation automatically after pull requests and pushes. This
does not authorize agents to run local checks. The pre-commit policy above,
including the dedicated subagent and all required checks, remains unchanged.
Implementation approval alone is not a request to commit. An explicit push request
authorizes only the mandatory local Playwright gate in addition to its Git operation.
See [CI/CD](./AGENTS-CICD.md).

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

## Engineering Principles (Robert C. Martin, Books 1–6)

These are **actionable, consolidated** rules drawn from _Clean Code_, _The Clean
Coder_, _Clean Architecture_, _Clean Agile_, _Clean Craftsmanship_, and
_Functional Design_. Apply them to the existing codebase, not as a reason to
replace working structures with textbook patterns. The project-specific guides
below govern their implementation details.

### Priorities and Scope

- Prioritize security and data integrity, correctness, clarity, maintainability,
  and then optimization. Do not trade away important correctness for speed.
- Prefer the simplest design that meets current requirements and is safe to
  change. Avoid speculative features, abstractions, frameworks, and dependencies.
- Keep changes focused, incremental, and reviewable. Preserve unrelated behavior,
  public contracts, data, and existing conventions unless change is required.
- Understand the task's objective, constraints, and acceptance criteria before
  changing code. Use the referenced implementation brief when one exists.
- Make design decisions based on the real code and requirements, not automatic
  application of Clean Architecture, SOLID, OOP, or functional patterns.
- Respect established APIs, schemas, and conventions; explain meaningful
  tradeoffs or intentional compatibility changes.

### Readable, Cohesive Code

- Optimize for the next reader. Prefer direct, expressive code over cleverness,
  compressed expressions, implicit behavior, and premature generalization.
- Use intention-revealing, accurate names for variables, functions, types,
  modules, and components. Avoid misleading names and unexplained abbreviations.
- Follow existing naming, formatting, file organization, and terminology.
  Do not introduce a competing style or rename unrelated symbols.
- Keep functions and modules cohesive: one clear responsibility or reason to
  change. Extract code when doing so improves understanding, not to meet a
  function-length, argument-count, or file-size quota.
- Keep a consistent level of abstraction within an operation where practical.
  Do not bury domain decisions in UI rendering or low-level plumbing.
- Prefer small, clear function signatures. Use named parameter objects when
  they improve clarity; avoid boolean flags that control unrelated behaviors.
- Remove duplicated _knowledge_ or business rules, but do not abstract two
  superficially similar pieces of code before their shared meaning is clear.
- Encapsulate implementation details and expose only what callers need. Choose
  plain data structures for data and behavior-bearing abstractions where useful;
  do not force class hierarchies onto TypeScript modules.
- Write code that explains what happens; comments and JSDoc should explain
  _why_, constraints, invariants, or non-obvious tradeoffs. Keep them accurate
  and follow `AGENTS-CONVENTIONS.md`.
- Watch for code smells: hidden side effects, deeply nested control flow,
  repeated decisions, too many responsibilities, broad interfaces, circular
  imports, and unnecessary coupling. Fix problems relevant to the requested
  change; do not start unrelated rewrites.
- Leave touched code a little clearer when doing so stays within scope.
  Refactor in small behavior-preserving steps rather than mixing extensive
  restructuring with feature changes.

### TypeScript, React, and Functional Design

- Use TypeScript's strict types to make valid states explicit. Prefer precise
  types and discriminated unions where they clarify behavior; avoid `any`,
  unchecked assertions, and non-null assertions without justification.
- Validate untrusted or external input at runtime; static types alone do not
  validate forms, Server Action payloads, API requests, or database data.
- Prefer pure, deterministic functions for calculations, validation decisions,
  data transformations, and domain logic. Keep data flow and dependencies
  explicit and minimize hidden mutable state.
- Prefer immutable data transformations. Never mutate React props or state;
  avoid side effects during rendering. Put necessary effects at appropriate
  boundaries rather than scattering them through presentation code.
- Model state transitions explicitly. Avoid redundant or contradictory state,
  and keep UI state, server state, and persisted state distinct when practical.
- Isolate database calls, network I/O, authentication, clocks, and other
  side effects from pure computations where this improves testability.
- Handle asynchronous operations deliberately: prevent stale updates,
  duplicate writes, or race conditions when a real interaction makes them
  possible. Do not add synchronization infrastructure without such a need.
- Use functional composition or objects/classes pragmatically according to the
  problem and the existing code; neither paradigm is mandatory.

### Architecture, Boundaries, and SOLID

- Organize code so important domain features and use cases remain discoverable.
  Keep responsibilities aligned with the current `app/`, `components/`,
  `lib/actions/`, `lib/queries/`, `lib/schemas/`, and `db/schema/` structure.
- Separate domain and application decisions from presentation, transport,
  persistence, and framework glue when a meaningful rule needs protection.
  Next.js, Drizzle, Turso, and better-auth are implementation dependencies,
  not reasons to duplicate business policy across layers.
- Keep source dependencies flowing toward more stable policies at genuine
  boundaries. Avoid circular imports and coupling stable domain decisions to
  volatile UI or infrastructure details.
- Apply **Single Responsibility** by grouping code that changes for the same
  reason; keep unrelated responsibilities separate. Group related changes
  together rather than scattering one use case across arbitrary utilities.
- Apply **Open/Closed** when actual variants justify extension points; do not
  invent plugin systems, strategy classes, or abstract factories for one case.
- Apply **Liskov Substitution** when using interchangeable implementations:
  replacements must honor documented input, output, and error contracts.
- Apply **Interface Segregation** by keeping interfaces and exported APIs
  narrow; consumers should not depend on operations they never use.
- Apply **Dependency Inversion** when decoupling policy from external services
  or unstable implementation details has a concrete benefit. Do not require
  an interface for every function, a repository for every table, or a layer
  for every use case.
- Choose component boundaries for cohesion and common reasons to change;
  avoid broad shared modules that force consumers to import unrelated code.
- Keep high-level application behavior stable when external APIs, database
  queries, or presentation mechanisms change. Translate data at boundaries
  when the formats or responsibilities genuinely differ.
- Keep nontrivial workflows/use cases explicit. Prefer composable application
  operations over business rules buried in route handlers or React components.
- Make complex dependencies easy to construct and replace in tests; centralize
  wiring only when construction complexity warrants it.
- Treat architecture as a means to reduce the cost of change, not an excuse
  for prescribed rings, layers, classes, microservices, or deployment units.

### Failures, Security, and Data Integrity

- Handle expected failures explicitly, close to the correct boundary. Avoid
  silently swallowed errors, misleading success results, and ambiguous `null`
  or boolean error signals when a clearer contract is appropriate.
- Keep failure handling readable and separate from the normal flow where
  practical. Preserve actionable error context without exposing secrets or
  implementation details to public clients.
- Treat every CMS mutation and protected read as a trust boundary: enforce
  authentication and authorization on the server, not merely through UI state,
  route visibility, or middleware/proxy checks.
- Validate and normalize inputs using the project's existing Zod conventions;
  protect data integrity and avoid leaking unpublished/private information.
  Follow `AGENTS-SECURITY.md` for authoritative security patterns.
- Do not introduce data loss, unreviewed destructive changes, or unsafe
  shortcuts to satisfy a deadline. Call out material privacy and security
  risks rather than concealing them.

### Testing, Refactoring, and Evidence

- Design important logic to be testable without mounting the whole app or
  contacting live external services. Prefer testing observable behavior over
  fragile implementation details.
- Create or update focused tests for important new behavior, bug regressions,
  validation, authorization, publishing rules, and data integrity when the
  change warrants them. Use acceptance criteria to choose test cases.
- Use TDD / Red–Green–Refactor when it clarifies a nontrivial requirement or
  reproduces a defect; do not mandate it for every edit or claim a red/green
  cycle happened unless the tests actually ran.
- Keep tests readable, deterministic, independent, and self-validating;
  fast unit tests are preferable for pure logic, with integration/end-to-end
  tests reserved for boundaries and complete user flows where appropriate.
- Test pure functions directly. Use stubs, fakes, spies, or mocks only when
  necessary for a boundary; avoid mocking implementation details.
- Consider property-based tests for complicated invariants or transformations,
  but do not add a dependency or a testing style without a concrete benefit.
- Refactor in small, behavior-preserving steps. Do not knowingly leave
  broken tests, invalid contracts, or incomplete error handling in proposed
  code. Do not represent unexecuted checks as evidence of correctness.
- **Authorization to run commands is controlled exclusively by the existing
  Pre-Commit Checks, Local browser hooks, and Automated CI sections above.**
  These engineering principles authorize writing or updating tests, but **not
  executing** formatters, linters, type checks, test suites, builds, or other
  verification during routine implementation. Record what was not run.

### Professional Agent Conduct and Delivery

- Be accountable for the scope and consequences of changes. Never conceal
  failed work, blockers, unsupported assumptions, or known risks.
- Distinguish an estimate or expectation from a verified result. Do not claim
  a build, test, migration, deployment, or integration succeeded without evidence.
- Say when a request would require unsafe shortcuts or conflicts with project
  constraints. State alternatives and tradeoffs instead of quietly weakening
  security, quality, or correctness.
- Surface missing requirements and consequential uncertainty early. Ask for
  clarification when truly necessary; otherwise take the smallest safe,
  reversible step and state any assumptions.
- Explain non-obvious decisions, dependency additions, observable behavior
  changes, and limitations succinctly. Avoid ceremonial process and reports
  that do not help review or delivery.
- Deliver complete, reviewable changes in small increments. Preserve the
  ability to integrate and ship, without bypassing the existing verification
  policy or introducing unrelated cleanup.

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
