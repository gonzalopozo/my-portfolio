---
name: agents-md-sync
description: 'Keep AGENTS.md and all AGENTS-*.md sub-files in sync with the actual codebase state'
---

# AGENTS.md Sync

Detect drift between what the AGENTS documentation files describe and what the codebase actually contains, then apply minimal, surgical updates — only the sections that are stale.

## When to Invoke

- After adding or removing a database entity (new table, renamed column)
- After adding, removing, or renaming routes in `app/`
- After significant dependency changes in `package.json` (new package, major version bump, removed package)
- After adding or removing a `.claude/skills/` skill
- After creating or deleting an `AGENTS-*.md` sub-file
- After restructuring `lib/`, `components/`, or `db/` directories
- When explicitly asked to "sync agents docs", "update AGENTS.md", or similar

## Principles

1. **Token efficiency** — Use `Glob` and directory listings (`ls`) instead of reading full source files. Read only the specific AGENTS sections being compared, not entire files.
2. **Structural checks over content reads** — Prefer file existence, directory shape, and export lists over parsing source code.
3. **Minimal edits** — Only modify lines/rows that are actually stale. Never rewrite entire files when a single table row changed.
4. **Idempotent** — Running this procedure when nothing changed MUST produce zero edits. Do not touch files that are already correct.
5. **Preserve style** — Match the existing heading hierarchy, table formatting, tree indentation, and prose tone. Never add fluff or redundant commentary.
6. **Parallel reads** — Gather all codebase context in Step 1 using parallel tool calls before comparing against AGENTS files.

## Files Covered

| File                           | Key sections to sync                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                    | Project Structure tree, Commands table, Tech Stack table, Common Tasks skill refs, Deep-Dive Guides table |
| `AGENTS-SETUP.md`              | Env vars list, installation commands, referenced file paths                                               |
| `AGENTS-CONVENTIONS.md`        | "Where to Prioritize" file path table                                                                     |
| `AGENTS-PATTERNS.md`           | Entity/route path references, migration checklists                                                        |
| `AGENTS-PATTERNS-REFERENCE.md` | Page/layout/route tables, pattern code references                                                         |
| `AGENTS-SECURITY.md`           | Config file references (`proxy.ts`, `next.config.ts`, `lib/auth.ts`)                                      |
| `AGENTS-SECURITY-REFERENCE.md` | Implementation file paths, audit commands                                                                 |
| `AGENTS-SEO.md`                | Metadata file references in `app/`                                                                        |
| `AGENTS-PERFORMANCE.md`        | Config references, component paths                                                                        |
| `AGENTS-ACCESSIBILITY.md`      | Component references, `globals.css` references                                                            |
| `AGENTS-ANIMATIONS.md`         | Animation library references vs actual dependencies                                                       |
| `AGENTS-TESTING.md`            | Test config files, directory structure                                                                    |
| `AGENTS-TESTING-REFERENCE.md`  | Test file paths, CI workflow references                                                                   |

---

## Procedure

### Step 1 — Gather Codebase Structural Snapshot

Collect the minimum context needed. Run all of the following reads **in parallel**:

| What to read                     | Tool                                                                                        | Purpose                 |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------- |
| `app/` directory (3 levels deep) | `Glob("app/**/*")`                                                                          | Route structure         |
| `db/schema/` contents            | `Glob("db/schema/*")`                                                                       | Entity inventory        |
| `lib/actions/` contents          | `Glob("lib/actions/*")`                                                                     | Action inventory        |
| `lib/queries/` contents          | `Glob("lib/queries/*")`                                                                     | Query inventory         |
| `lib/schemas/` contents          | `Glob("lib/schemas/*")`                                                                     | Zod schema inventory    |
| `components/` (2 levels)         | `Glob("components/**/*")`                                                                   | Component inventory     |
| `.claude/skills/` directories    | `Glob(".claude/skills/*/SKILL.md")`                                                         | Skill inventory         |
| Root `AGENTS-*.md` files         | `Glob("AGENTS-*.md")`                                                                       | Sub-file inventory      |
| `package.json`                   | Read — only the `scripts`, `dependencies`, and `devDependencies` keys                       | Commands & tech stack   |
| Config files existence           | `Glob("{proxy.ts,next.config.ts,vitest.config.*,playwright.config.*,.github/workflows/*}")` | Referenced config files |

**Do NOT read any `.ts`/`.tsx` source files beyond `package.json` in this step.**

Store results as the **Snapshot** — all subsequent steps compare AGENTS sections against this Snapshot.

---

### Step 2 — Sync `AGENTS.md` § Project Structure

1. Read `AGENTS.md` — only the `## Project Structure` section (the fenced code block tree).
2. Compare the tree entries against the Snapshot directories:
    - `app/` top-level route groups and key files
    - `components/` sub-directories
    - `db/schema/`
    - `lib/` sub-directories and key files (`auth.ts`, `auth-client.ts`, `server-session.ts`, `utils.ts`)
3. For each **new directory or key file** not in the tree → add it, preserving the existing indentation (`├──`/`└──`) and inline comment style (`# description`).
4. For each **deleted directory or key file** still in the tree → remove it.
5. If no changes needed → skip, make zero edits.

---

### Step 3 — Sync `AGENTS.md` § Commands

1. Read `AGENTS.md` — only the `## Commands` table.
2. Build expected commands from `package.json` `scripts`, filtering to user-facing commands only:
    - **Include**: `dev`, `build`, `lint`, `db:setup`, `test`, `test:e2e`, `start`, and any new top-level scripts the developer would run directly.
    - **Exclude**: Internal/composed scripts (`migrate:generate`, `migrate:push`) and tooling scripts (`audit`, `audit:fix`, `check-updates`, `update:latest`, `skills:*`).
3. Compare table rows against expected commands.
4. Add rows for new commands, remove rows for deleted commands.
5. If no changes needed → skip.

---

### Step 4 — Sync `AGENTS.md` § Tech Stack

1. Read `AGENTS.md` — only the `## Tech Stack` table.
2. Compare each row against `package.json` dependencies:
    - **Framework row**: Check `next` version (major.minor), presence of `babel-plugin-react-compiler`.
    - **Language row**: Check `typescript` version.
    - **Styling row**: Check `tailwindcss` version, presence of `tw-animate-css`.
    - **Database row**: Check `drizzle-orm`, `@libsql/client`.
    - **Auth row**: Check `better-auth`.
    - **UI row**: Check `cmdk`, `sonner`, `lucide-react`, `react-icons`, any Radix packages.
    - **Animations row**: Check `motion`, `@number-flow/react`.
3. Update version numbers only for **major or minor** bumps (ignore patch). Add/remove packages if the tech stack composition changed.
4. If no changes needed → skip.

---

### Step 5 — Sync `AGENTS.md` § Skill References & Deep-Dive Guides

**5a — Common Tasks skill references:**

1. Read `AGENTS.md` — only the `## Common Tasks` section.
2. Collect every `.claude/skills/*/SKILL.md` path mentioned.
3. Compare against the Snapshot skill inventory.
4. If a referenced skill no longer exists → remove the reference.
5. Do NOT auto-add new skills here — skill references in Common Tasks are curated per workflow, not an exhaustive list.

**5b — Deep-Dive Guides table:**

1. Read `AGENTS.md` — only the `## Deep-Dive Guides` table.
2. Collect every `AGENTS-*.md` filename linked in the table.
3. Compare against the Snapshot sub-file inventory.
4. For each new `AGENTS-*.md` file not in the table → add a row with a descriptive "When to read" value derived from the file's `#` title (read only line 1-5 of the new file).
5. For each deleted `AGENTS-*.md` file still in the table → remove the row.
6. If no changes needed → skip.

---

### Step 6 — Sync `AGENTS-PATTERNS.md` & `AGENTS-PATTERNS-REFERENCE.md`

**6a — `AGENTS-PATTERNS.md`:**

1. Read sections that contain file path references:
    - `## 1. Container-Presentational Pattern` → `### Template` (example paths like `app/(admin)/dashboard/projects/`)
    - `## 3. Data Access Facade` → `### Template` (example query paths)
    - `## 5. Next.js File-System Conventions` → `### Files to Create Before Production`
    - `## Implementation Checklist`
2. Verify each referenced file path exists in the Snapshot.
3. Update stale paths. If a pattern example references a route that was renamed/moved, update it.

**6b — `AGENTS-PATTERNS-REFERENCE.md`:**

1. Read sections containing path tables:
    - `### Page` — page paths table
    - `### Layout` — layout paths table
    - `### Not Found` — not-found paths table
    - `### Route Handler` — route handler paths table
    - `### Route Groups` — route group table
2. Compare each table against `app/` Snapshot.
3. Add rows for new pages/layouts/routes, remove rows for deleted ones.
4. If no changes needed → skip.

---

### Step 7 — Sync Remaining `AGENTS-*.md` Sub-Files

For each sub-file below, read **only the sections that contain file path references or version-sensitive data**, then verify against the Snapshot. Apply edits only where drift is found.

**`AGENTS-SETUP.md`:**

- § Environment Variables — verify listed env vars match what the app actually requires (cross-check `lib/auth.ts` imports and DB config if needed).
- § Making Schema Changes — verify `db/schema/` path reference.

**`AGENTS-CONVENTIONS.md`:**

- § Where to Prioritize — verify every file path in the priority table exists.

**`AGENTS-SECURITY.md`:**

- Verify references to `proxy.ts`, `next.config.ts`, `lib/auth.ts`, `lib/server-session.ts` exist.
- § Setup Checklist — verify referenced files.

**`AGENTS-SECURITY-REFERENCE.md`:**

- Verify references to `proxy.ts`, `next.config.ts`, `lib/server-session.ts`, `lib/auth.ts`, `package.json`.

**`AGENTS-SEO.md`:**

- § Metadata File Conventions — verify `app/` metadata file references (`opengraph-image.tsx`, `sitemap.ts`, `robots.ts`) exist.

**`AGENTS-PERFORMANCE.md`:**

- § Project-Specific Guidance — verify component paths in the dynamic import table.
- § Where to Add Loading Files — verify route paths.
- Verify `components/web-vitals.tsx` and `next.config.ts` references.

**`AGENTS-ACCESSIBILITY.md`:**

- § Semantic Layout Structure — verify layout file references.
- § Skip Link — verify `components/skip-link.tsx` exists.
- § Public Page heading hierarchy — verify matches actual `app/(public)/page.tsx` structure (check file exists, do NOT read full contents).

**`AGENTS-ANIMATIONS.md`:**

- § When to Use Each Layer — verify animation packages (`motion`, `@number-flow/react`, `tw-animate-css`) are still in `package.json`.
- Verify `components/animated-section.tsx` reference.

**`AGENTS-TESTING.md`:**

- § Tool Setup — verify `vitest.config.mts`, `playwright.config.ts` exist.
- § Test File Location — verify `tests/` and `e2e/` directories exist.

**`AGENTS-TESTING-REFERENCE.md`:**

- Verify test file path references (`tests/actions/`, `tests/schemas/`, `e2e/`).
- § CI GitHub Actions Workflow — verify `.github/workflows/test.yml` exists.

**For every sub-file:** if all referenced paths and data are correct → make zero edits.

---

### Step 8 — Verification: Cross-Reference Consistency

After all edits from Steps 2-7 are applied, run a final consistency check:

1. **Deep-Dive Guides completeness** — `Glob("AGENTS-*.md")` and confirm every result appears in the `AGENTS.md` Deep-Dive Guides table. Flag any missing.

2. **Skill reference validity** — Collect every `.claude/skills/*/SKILL.md` path mentioned across ALL AGENTS files. For each, `Glob` to confirm the SKILL.md exists. Flag any broken references.

3. **Inter-file link validity** — Collect every `AGENTS-*.md` cross-reference (e.g., `AGENTS-SECURITY-REFERENCE.md` referencing `AGENTS-SECURITY.md`). Confirm each target file exists.

4. **Stale file path spot-check** — From Steps 6-7, collect up to 20 unique file paths referenced in AGENTS files. Batch-verify existence with `Glob`. Flag any that don't exist.

5. **Report** — Print a summary:
    - Number of AGENTS files checked
    - Number of sections compared
    - Number of edits applied (0 if fully in sync)
    - Any unresolved inconsistencies (file paths that don't exist but may be intentional — e.g., files listed in a "Files to Create Before Production" checklist)

---

## Anti-Patterns

| Do NOT                                    | Why                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| Rewrite entire AGENTS files               | Destroys git blame, wastes tokens, risks regressions                                        |
| Read full `.ts`/`.tsx` source files       | Token-expensive; structural checks (file existence, directory listings) are sufficient      |
| Add new documentation sections            | This skill syncs existing content, it does not author new docs                              |
| Add comments explaining your edits        | AGENTS files are documentation, not code — edits should be seamless                         |
| Change prose tone or restructure headings | Preserve the existing voice and hierarchy exactly                                           |
| Auto-add every new skill to Common Tasks  | Common Tasks lists curated workflow-specific skills, not an exhaustive inventory            |
| Update patch-level version numbers        | Only major/minor bumps matter for documentation accuracy                                    |
| Flag intentionally-future file paths      | Files listed in "TODO" or "Files to Create" checklists may not exist yet — that is expected |
