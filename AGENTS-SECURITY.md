# AGENTS-SECURITY.md

Security guidelines for the portfolio project — all security layers for a Next.js 16 app deployed on Vercel with better-auth, Drizzle ORM, and Turso.

> Full implementation code (proxy.ts, next.config.ts headers, SDK examples, audit commands): [AGENTS-SECURITY-REFERENCE.md](./AGENTS-SECURITY-REFERENCE.md)

> **Before implementing or modifying authentication, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/better-auth-best-practices/SKILL.md`

> **Before writing or reviewing database queries, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/drizzle-orm/SKILL.md`

> **Before hardening Server Actions, execute the following skills** — read each SKILL.md and follow its instructions:
>
> 1. `.claude/skills/vercel-react-best-practices/SKILL.md`
> 2. `.claude/skills/next-best-practices/SKILL.md`

---

## Content Security Policy (CSP)

CSP is configured with independent public and administrative policies. Both default to
**report-only**. Validate browser enforcement and deployed rendering/caching
compatibility in protected Preview before production activation; automated commit
checks do not establish them.
Use the protected Preview procedure in [the reference](./AGENTS-SECURITY-REFERENCE.md#csp-rollout-and-verification).

### Policy ownership and rendering

- `next.config.ts` sets the stable public policy, excluding `/login`, `/dashboard`,
  APIs, and Next.js internals. It never generates nonces or changes public caching.
- `proxy.ts` sets administrative policy on `/login` and `/dashboard/:path*`,
  including redirects and prefetch requests. It strips incoming nonce/policy headers
  and forwards its own CSP request header to Next.js. It does not validate sessions.
- `lib/security/csp.ts` constructs policies and validates configuration.
- `CSP_PUBLIC_MODE` and `CSP_ADMIN_MODE` accept `report-only` (default) or `enforce`.
  Unknown values fail configuration rather than silently disabling the policy.
- `CSP_ADMIN_POLICY=static` is the default and safe fallback. `nonce` is supported
  when `VERCEL_ENV` is `preview` or `production`, after protected Preview validation.
  Unknown policies and unsupported nonce environments fail configuration.
- Public and administrative routes use separate root layouts and shared document
  providers. Crossing roots loads a new document; CSP on an RSC navigation response
  does not replace the current document policy. Use document navigation for policy
  boundaries. Login/logout explicitly use `window.location.assign`.

The public policy permits inline scripts for prerendered Next.js framework payloads
and the theme initialization script. **It is not a strict script-XSS policy.**
`script-src-attr 'none'` blocks inline event handlers in supporting browsers but does
not block injected inline script elements. Production never permits `unsafe-eval`.

All application schemas import Zod through `lib/zod.ts`, which enables `jitless`
before schemas are constructed. This avoids both runtime parser compilation and
the `Function` availability probe that itself triggers browser CSP reports.
Keep future schemas on this configured import; do not permit production evaluation
to accommodate a validation dependency.

`upgrade-insecure-requests` is included only under enforcement outside development.
It is omitted from report-only policies because browsers ignore it in that mode.

Styles permit inline declarations and style elements because React, Motion, Radix,
the grid, and Sonner require them. Sonner injects a nonce-free stylesheet. These
allowances have a security cost and must be reassessed when dependencies change.

Public browser connections allow only same origin and the six observed Carto
origins. Public workers allow same origin and `blob:` for MapLibre 5.19.0. Images
allow same origin, `data:`, public `blob:` URLs, and the configured Blob store origin.
Remote image optimizer patterns are separate from browser CSP: optimized remote
images arrive through same-origin `/_next/image`. Server-side Last.fm, Spotify,
Turso, and OG-image fetches do not require browser `connect-src` allowances.

### Administrative nonces

The existing shared root could not receive an administrative nonce without adding
request dependencies to the public layout or leaving the theme script unapproved.
Separate roots avoid that conflict. The administrative root waits for
headers inside Suspense **above the document**, producing an empty static shell.
Installed Next.js 16.2.6 source explicitly accommodates this arrangement. Verify
generated script nonces in a production build/browser after framework changes.

Administrative nonces use 32 cryptographically random bytes per matched request.
The CSP request header and `x-nonce` reach Next.js; the theme provider receives that nonce.
Script policy uses `nonce` plus `strict-dynamic`, without production inline-script
allowances. Styles retain their documented compatibility allowance.

Do not activate nonces based only on report-only observation. Test actual
enforcement, streaming, errors, navigation, actions, and hydration in an isolated,
protected Preview. The project owner reports these rollout gates completed; see
the dated status in the reference. Production activation still requires verifying
the promotion change and checking the deployed headers and flows.
If any gate fails, restore the static administrative policy. Do not weaken nonce
directives or disable Cache Components to silence failures.

### Shared-origin threat model

Public and admin routes share the same browser origin. Public-page XSS can attempt
administrative requests under a logged-in administrator's session. Route groups,
separate document roots, HttpOnly/SameSite cookies, CSRF checks, and administrator
allowlists do not isolate that origin or neutralize executing same-origin JavaScript.

Prevent injection through React text escaping, protocol-checked links, validated
CMS mutations, and normalized SVGs rendered as React nodes. Existing stored links
also receive output-side checks. No rich-text/HTML rendering is introduced.
A separate admin origin remains a future option, outside this implementation.

---

## Security Headers

`next.config.ts` applies `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, and a Permissions Policy disabling
camera, microphone, geolocation, and browsing topics. Production HSTS is
`max-age=31536000`, without `includeSubDomains` or `preload` commitments.

- Never add deprecated `X-XSS-Protection`.
- Do not override public HTML, RSC, or static-asset cache headers.
- Administrative proxy responses use `private, no-store`; verify final deployed
  headers and framework/platform overrides before release.
- Deployment-level headers, HTTPS, Preview protection, and WAF settings remain
  operational prerequisites; repository configuration alone cannot verify them.

---

## Authentication and Administrator Authorization

`getServerSession()` uses better-auth and React request-level `cache()`. Its existing
five-minute signed cookie cache may avoid a database read and delays revocation.
It is not a persistent Next.js data cache.

A valid session alone does not grant CMS access. `lib/admin.ts` centralizes checks:

- `getAdminSession()` returns a validated allowlisted session or `null`.
- `requireAdmin()` protects mutations and storage writes: unauthenticated callers
  redirect to login; authenticated non-admins receive generic access denial.
- `requireAdminPage()` protects pages and administrative query entrypoints; rejected
  reads redirect to the overview for access denial or expired-session recovery.
- The dashboard layout also guards rendering. The overview handles invalid cookies
  using the existing same-origin session-clearing form, avoiding redirect loops.
- Public cached query entrypoints remain independent of session authorization.

Set server-only `ADMIN_USER_IDS` to comma-separated stable better-auth user IDs.
Whitespace is trimmed and duplicates removed. Missing/empty configuration, empty
entries, or malformed IDs grant **no** privileges. IDs allow letters, digits,
underscores, and hyphens, up to 128 characters. Provision accounts manually and
configure each environment explicitly; never use `NEXT_PUBLIC_*`, email matching,
client data, logging, automatic enrollment, or an inferred administrator account.
No role tables or migrations are introduced.

Keep proxy cookie checks as optimistic UX only. Every protected read and mutation
must enforce server-side authorization independently. Authentication/session
management endpoints remain accessible for login, logout, and recovery, with their
existing Origin and CSRF checks intact.

`BETTER_AUTH_TRUSTED_ORIGINS` can extend the fixed production origins with exact
HTTPS Preview origins or HTTP localhost/127.0.0.1 development origins. Wildcards,
credentials, paths, queries, and fragments are rejected. Never trust all Vercel apps.

---

## Server Actions Security

Every action follows the **4-step pattern**: authenticate and authorize → validate → execute → revalidate. See [AGENTS-PATTERNS.md § Server Action Hardening](./AGENTS-PATTERNS.md#2-server-action-hardening-strategy-like) for the template.

### Rules

- **Step 1 is mandatory** — `requireAdmin()` before validation, queries, or storage writes
- **Step 2 uses Zod `.safeParse()`** — never trust `formData.get()` directly
- **Step 3 uses Drizzle ORM** — never concatenate strings into SQL
- **Never expose internal errors** — return user-friendly messages, log internals server-side
- **`formData.get()` returns `FormDataEntryValue | null`** — handle `null` before Zod
- **Remove all `console.log` statements** from production code

### Revalidate vs Redirect (Step 4)

| Scenario                              | Use                                     | Why                   |
| ------------------------------------- | --------------------------------------- | --------------------- |
| **Create** (user on `/new` or dialog) | `redirect("/dashboard/entities")`       | Navigate back to list |
| **Update** (user stays on same page)  | `revalidatePath("/dashboard/entities")` | Refresh in-place      |
| **Delete** (user stays on same page)  | `revalidatePath("/dashboard/entities")` | Seamless UI refresh   |

`redirect()` already triggers a fresh render — a preceding `revalidatePath()` to the same path is redundant.

---

## Input Validation with Zod

Schemas in `lib/schemas/` — see [AGENTS-PATTERNS.md § Zod Schemas](./AGENTS-PATTERNS.md#2-server-action-hardening-strategy-like).

- **Validate on the server** — client-side validation is UX only; the Server Action is the security boundary
- **Use `.safeParse()`** — graceful error handling without try-catch
- **Set max lengths** — prevent DoS via long inputs; match DB column constraints
- **Use `.or(z.literal(""))` for optional URL fields** — empty form strings aren't valid URLs
- **Transform empty strings to `undefined`** via `.transform()`

---

## SQL Injection Prevention

Drizzle ORM produces parameterized queries by default. Safe patterns:

```typescript
db.select().from(projects).where(eq(projects.id, id)); // Query builder — safe
db.insert(projects).values({ title, description }); // Insert — safe
sql<number>`COALESCE(MAX(${projects.order}), 0)`; // sql template — safe (parameterized)
```

**Never do**:

- `db.execute(\`SELECT \* FROM projects WHERE id = ${id}\`)` — SQL injection
- `sql.raw(\`... WHERE title = '${title}'\`)` — SQL injection
- Dynamic table/column names from user input

### Rules

- **Always use the Drizzle query builder** or `sql` template literal
- **Never use `sql.raw()` with user input**
- **Validate IDs as numbers before queries** — even though Drizzle parameterizes

---

## Secure Environment Variables

| Pattern         | Exposure                                   | Examples                                                       |
| --------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `NEXT_PUBLIC_*` | Bundled in client JS (visible to everyone) | `NEXT_PUBLIC_API_URL`                                          |
| No prefix       | Server-only (never sent to browser)        | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET` |

### Rules

- **NEVER prefix secrets with `NEXT_PUBLIC_`**
- **NEVER commit `.env.local` to git** — verify `.gitignore` includes it
- **Generate `BETTER_AUTH_SECRET`** with `openssl rand -base64 32` (at least 32 chars)
- **On Vercel, use Sensitive Environment Variables** — encrypted, non-readable after creation
- **Use different values per environment** (Production, Preview, Development)

---

## CSRF Protection

- **better-auth verifies `Origin` header** on all mutation requests — rejects if origin doesn't match `trustedOrigins`
- **Next.js Server Actions are protected by default** — framework validates `Origin` header; no additional CSRF tokens needed
- **Do NOT set `disableCSRFCheck: true`** or `disableOriginCheck: true` in better-auth
- **Session cookies use `SameSite: 'lax'`** by default — allows top-level navigations, blocks cross-site form submissions
- **Custom API routes** (beyond `/api/auth/*`) need manual CSRF token verification

---

## Secure Cookies & Sessions

better-auth manages session cookies with flags: `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`, `path: '/'`.

- **Never access session cookies in client JavaScript** — `httpOnly` by design
- **Cookie cache (5 min)** — revoked session valid up to 5 minutes; acceptable for single-admin dashboard
- **Don't implement custom session timeout** — better-auth handles expiration/renewal
- **Custom cookies** must always set: `httpOnly`, `secure`, `sameSite`, reasonable `maxAge`

---

## Rate Limiting

**Use Vercel WAF as the primary rate limiting layer** — operates at the edge with global state, before your code runs. In-memory counters (LRU, Map, better-auth `"memory"` storage) are unreliable on serverless — instances don't share memory, cold starts reset counters.

### Recommended WAF Rules

| Rule            | Path          | Limit   | Window | Action     |
| --------------- | ------------- | ------- | ------ | ---------- |
| Auth protection | `/api/auth/*` | 20 req  | 60s    | Deny (429) |
| General API     | `/api/*`      | 100 req | 60s    | Deny (429) |

On Hobby, confirm the current custom-rule allowance and prioritize auth protection;
do not assume both recommended rules can be enabled. No WAF rule is configured by
repository files.

### Rules

- better-auth rate limiting is explicitly enabled with database storage in `lib/auth-config.ts`; `rateLimits` persists counters across instances. Keep its migration and integration tests.
- **Stricter limits on auth endpoints** (10-20 req/min) — most targeted
- **Return `429 Too Many Requests`** with `Retry-After` header when possible
- Firewall SDK examples are optional references, not installed dependencies. Prefer the existing persistent auth limiter unless a reviewed dashboard rule needs additional application context.

> Full `@vercel/firewall` SDK examples and WAF plan limits: [AGENTS-SECURITY-REFERENCE.md](./AGENTS-SECURITY-REFERENCE.md#rate-limiting-details)

---

## Source Maps & Production Hardening

- **Never enable `productionBrowserSourceMaps: true`** — exposes source code
- Preserve classified JSON operation logs; do not strip operational `info` logs globally. Sentry console forwarding remains disabled.
- **Never log sensitive data** — tokens, passwords, DB URLs must never appear in logs

---

## Dependency Security

- Automated security workflows audit before release; no unresolved high/critical findings. The root restriction still governs agent-run local checks.
- **`pnpm up` weekly** (within semver ranges), `pnpm dlx npm-check-updates` monthly (check majors)
- **Lock file is your friend** — always commit `pnpm-lock.yaml`
- **Ignore unfixable CVEs explicitly** in `auditConfig.ignoreCves` rather than ignoring the entire audit

> Full audit commands and workflow: [AGENTS-SECURITY-REFERENCE.md](./AGENTS-SECURITY-REFERENCE.md#dependency-audit-commands)

---

## Vercel Security Features

| Automatic (no config)        | Needs Configuration                       |
| ---------------------------- | ----------------------------------------- |
| HTTPS + SSL/TLS certificates | Mark secrets as Sensitive in dashboard    |
| DDoS mitigation              | Attack Challenge Mode (CAPTCHA for bots)  |
| Edge network / global CDN    | Deployment Protection (restrict previews) |
| Encrypted env vars at rest   | WAF rate limit rules                      |

### Rules

- **Always mark secrets as Sensitive** — `TURSO_AUTH_TOKEN`, `BETTER_AUTH_SECRET`, `TURSO_DATABASE_URL`
- **Do not expose admin routes in preview deployments**

---

## Defense in Depth Summary

| Layer          | Protection            | This Project                         |
| -------------- | --------------------- | ------------------------------------ |
| Network        | DDoS, HTTPS           | Vercel (automatic)                   |
| Edge           | Rate limiting         | Vercel WAF rules                     |
| Transport      | HSTS, TLS             | Security headers in `next.config.ts` |
| Application    | CSP, headers          | `proxy.ts` + `next.config.ts`        |
| Authentication | Session validation    | better-auth + `getServerSession()`   |
| Authorization  | Explicit admin IDs    | Server-only `requireAdmin()`         |
| Input          | Validation            | Zod schemas + Drizzle ORM            |
| Data           | Parameterized queries | Drizzle ORM (automatic)              |
| Dependencies   | Vulnerability audit   | `pnpm audit`                         |

---

## Setup Checklist (TODO)

- [x] Add independent public/admin CSP and support administrative nonces in Preview/Production
- [x] Complete protected Preview baseline and enforcement validation (owner-reported)
- [ ] Configure `ADMIN_USER_IDS` separately in each environment
- [ ] Activate validated policies and record browser/caching evidence
- [x] Add security headers to `next.config.ts`
- [ ] Add `removeConsole` compiler option to `next.config.ts`
- [x] Add Zod validation for CMS mutations and safe link protocols
- [x] Enforce administrator authorization on CMS reads, actions, and storage writes
- [ ] Mark secrets as Sensitive in Vercel dashboard
- [ ] Add WAF rate limit rules (`/api/auth/*` 20 req/min, `/api/*` 100 req/min)
- [x] Configure persistent better-auth rate limiting and committed schema migration
- [x] Add audit scripts to `package.json`

## CI/CD security ownership

See [CI/CD](./AGENTS-CICD.md) and [operations](./docs/operations/README.md) for
workflow permissions, fork isolation, Dependabot/CodeQL/secret protection, production
credentials, approval gates and recovery. These do not authorize local scans.
Sentry uses explicit minimized data collection and private source-map upload.
Public and administrative CSP allow only the configured exact Sentry ingest origin.
