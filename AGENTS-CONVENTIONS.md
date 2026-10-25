# AGENTS-CONVENTIONS.md

Code conventions for the portfolio project — JSDoc guidelines that go beyond what the linter and TypeScript enforce.

> **Before implementing complex type logic, generics, or utility types, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/typescript-advanced-types/SKILL.md`

---

## JSDoc

Since TypeScript already provides type safety, use JSDoc to add **semantic context** — the "why", not the "what". Do not restate information that types already express.

### When to Document

Document when there is:

- Non-obvious logic or business rules
- Side effects (revalidation, redirects, external calls)
- Security assumptions or constraints
- Possible errors or edge cases
- Deprecations or temporary workarounds

Skip JSDoc for:

- Self-explanatory functions where the name + types say it all
- Simple component props already typed with an interface
- One-liner utilities with clear names (e.g., `formatDate`)

### Approved Tags

| Tag           | Use for                                                                   | Example context                                      |
| ------------- | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| `@param`      | Only when the name/type isn't self-explanatory, or to clarify constraints | `@param id - Must be > 0, validated upstream by Zod` |
| `@returns`    | Only when the return value has non-obvious meaning                        | `@returns null when the user has no active session`  |
| `@throws`     | Server actions / functions that throw or redirect                         | `@throws Redirects to /login if unauthenticated`     |
| `@example`    | Complex utilities where usage isn't obvious                               | `@example cn("base", condition && "extra")`          |
| `@deprecated` | Superseded code that still exists                                         | `@deprecated Use getServerSession() instead`         |
| `@see`        | Link to related code, docs, or decisions                                  | `@see AGENTS-SECURITY.md for auth pattern`           |
| `@todo`       | Known improvements pending                                                | `@todo Add Zod validation (issue #42)`               |

Avoid `@type`, `@typedef`, `@callback` — TypeScript handles these.

### Where to Prioritize

| Location                               | Priority   | Reason                                             |
| -------------------------------------- | ---------- | -------------------------------------------------- |
| `lib/actions/*` (Server Actions)       | **High**   | Side effects, auth checks, revalidation, redirects |
| `lib/auth.ts`, `lib/server-session.ts` | **High**   | Security assumptions, session flow                 |
| `db/schema/*`                          | **Medium** | Relationships, constraints, enum meanings          |
| `components/ui/*` (reusable)           | **Medium** | Prop behavior, variants, accessibility notes       |
| `lib/utils.ts`                         | **Low**    | Only if logic is non-trivial                       |
| Page/layout components                 | **Low**    | Only for unusual data fetching or auth patterns    |

### Examples

**Server Action** (`lib/actions/`):

```typescript
/**
 * Updates a project and its associated skills.
 * Revalidates both the dashboard and public page caches.
 *
 * @throws Redirects to /login if the session is invalid.
 * @throws Error if the project ID does not exist.
 */
export async function updateProject(formData: FormData) {
	// ...
}
```

**Schema** (`db/schema/`):

```typescript
/**
 * Tracks employment status changes over time.
 * Each row is an immutable snapshot — never update, only insert.
 */
export const employmentHistory = sqliteTable('employment_history', {
	// ...
});
```

**Auth helper** (`lib/`):

```typescript
/**
 * Retrieves the current admin session from cookies.
 *
 * @returns The session object, or `null` if unauthenticated.
 * @see AGENTS-SECURITY.md — "Auth Protection Pattern" for the two-layer approach.
 */
export async function getServerSession() {
	// ...
}
```

**UI component** (`components/ui/`):

```typescript
/**
 * Combobox for selecting multiple skills with search filtering.
 * Renders as a popover with a command palette (cmdk).
 *
 * @see https://ui.shadcn.com/docs/components/combobox
 */
```

**Deprecation**:

```typescript
/**
 * @deprecated Replaced by `getServerSession()`. Will be removed in v2.
 */
export function getSessionFromCookie() {
	// ...
}
```

### Style Rules

- Use `/** ... */` (not `//` or `/* */`) so editors parse the JSDoc
- First line: concise summary (what + why, one sentence)
- Blank line before tags if there is a description body
- Keep descriptions under 80 characters per line when possible
- Write in English, imperative mood ("Retrieves...", not "This function retrieves...")
