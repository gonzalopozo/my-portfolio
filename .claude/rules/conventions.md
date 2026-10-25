---
description: JSDoc conventions — when and how to document code. Applies to lib/, db/, and components/.
globs:
    - 'lib/**'
    - 'db/**'
    - 'components/**'
---

## JSDoc Rules

TypeScript provides type safety — use JSDoc only for **semantic context** (the "why", not the "what").

**Document when**: non-obvious logic, side effects (revalidation, redirects), security assumptions, edge cases, deprecations.

**Skip JSDoc for**: self-explanatory functions, typed component props, one-liner utilities with clear names.

### Approved Tags

- `@param` — only when name/type isn't self-explanatory
- `@returns` — only when return value has non-obvious meaning
- `@throws` — actions that throw or redirect
- `@example` — complex utilities only
- `@deprecated`, `@see`, `@todo` — standard usage

**Never use** `@type`, `@typedef`, `@callback` — TypeScript handles these.

### Style

- Use `/** ... */` (not `//` or `/* */`)
- First line: concise summary, imperative mood ("Retrieves...", not "This function retrieves...")
- Blank line before tags if there's a description body
- Keep under 80 chars per line

### Priority

| Location                               | Priority                                    |
| -------------------------------------- | ------------------------------------------- |
| `lib/actions/*`                        | **High** — side effects, auth, revalidation |
| `lib/auth.ts`, `lib/server-session.ts` | **High** — security assumptions             |
| `db/schema/*`                          | **Medium** — relationships, constraints     |
| `components/ui/*`                      | **Medium** — prop behavior, a11y notes      |
| `lib/utils.ts`, pages/layouts          | **Low** — only if non-trivial               |

Full examples and context: see AGENTS-CONVENTIONS.md
