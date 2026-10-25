---
description: Security rules — auth patterns, input validation, CSP, environment variables. Critical for actions, auth, and API routes.
globs:
    - 'lib/actions/**'
    - 'lib/auth*.ts'
    - 'lib/server-session.ts'
    - 'lib/schemas/**'
    - 'app/api/**'
    - 'proxy.ts'
---

## Security Rules

### Auth Protection (two-layer)

- **NEVER rely on `proxy.ts` for security** — it only checks cookie existence (UX redirect)
- **ALWAYS call `getServerSession()` in every protected page and every Server Action**
- `cache()` wrapping in `server-session.ts` deduplicates DB calls within a request

### Server Actions

- Every action: authenticate → validate (Zod `.safeParse()`) → execute (try-catch) → revalidate
- **Never expose internal errors** — return user-friendly messages, log server-side
- `formData.get()` returns `FormDataEntryValue | null` — handle null before Zod
- Remove all `console.log` statements from production code

### Input Validation

- Validate on the server — client-side is UX only
- Use `.safeParse()` — graceful errors without try-catch
- Set max lengths — prevent DoS, match DB constraints
- Use `.or(z.literal(""))` for optional URL fields

### SQL Injection Prevention

- **Always use Drizzle query builder** or `sql` template literal
- **Never use `sql.raw()` with user input**
- **Never concatenate strings into SQL** — `db.execute(\`...\`)` with interpolation is injection

### Environment Variables

- **NEVER prefix secrets with `NEXT_PUBLIC_`**
- **NEVER commit `.env.local` to git**
- Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`

### CSP

- Dev mode needs `'unsafe-eval'` and `'unsafe-inline'` — NOT in production
- If adding third-party scripts, add domains to `script-src` and `connect-src`

### Headers

- Do NOT add `X-XSS-Protection` — deprecated, CSP replaces it
- Do NOT set `Cache-Control` for `_next/static` — Next.js handles it

### CSRF

- Do NOT set `disableCSRFCheck: true` or `disableOriginCheck: true` in better-auth
- Custom API routes beyond `/api/auth/*` need manual CSRF token verification

Full implementation details: see AGENTS-SECURITY.md and AGENTS-SECURITY-REFERENCE.md
