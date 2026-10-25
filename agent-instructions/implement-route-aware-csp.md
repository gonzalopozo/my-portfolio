# Implement route-aware Content Security Policy

## Objective

Preserve public Next.js 16 Cache Components, prerendering, PPR, revalidation, and
eligible CDN caching while introducing verifiable browser policy and explicit
administrator authorization. Do not claim strict XSS prevention for inline-enabled
public scripts or browser-origin isolation between portfolio and CMS.

## Context and baseline

The previous Cursor conversation in `.tmp/cursor_content_security_policy_configur.md`
correctly described CSP as pending. Source inspection found Next.js 16.2.6,
`cacheComponents: true`, cached public queries, cookie-existence-only proxy redirects,
no configured CSP/security headers, a shared theme script without a nonce, missing
authorization on most administrative reads, and incomplete mutation/URL validation.
At that baseline audit, no deployment settings, builds, tests, or browser checks
were executed.

## Required behavior and implemented structure

- Stable public CSP in `next.config.ts`; independent administrative CSP in `proxy.ts`.
  Both default to report-only. General security headers remain independent of modes.
- Static administrative policy is the default/fallback. A request-nonce candidate
  is restricted to Preview and must pass isolated enforcement before promotion.
- Separate public/admin roots share `AppDocument`, fonts, styles, and providers.
  Public rendering reads no request APIs. Only the candidate admin document reads
  nonce headers, behind Suspense above the root document. Cross-root navigation
  loads a document; explicit login/logout navigation does the same.
- Every protected CMS page/read/action/storage write checks the server-only stable
  user-ID allowlist. Invalid/missing configuration grants no access. Session recovery
  and public auth endpoints retain their existing security checks.
- Server-side CMS schemas validate text, URL protocols, IDs, ordering, dates, and
  submitted skill selections. Output-side URL checks disable unsafe stored links.
- Public cache functions, tags, lifetimes, and invalidation behavior are preserved.
  Administrative proxy responses declare private/no-store.
- Browser evidence is the initial reporting process. No collector, roles/migrations,
  added dependency, external reporting provider, or production deployment is included.

## Constraints and decisions

Never disable Cache Components or add public nonces/request dependencies. Production
scripts never permit evaluation. Document necessary inline styles/scripts, data/Blob
images, and MapLibre Blob workers. Restrict network origins to observed resource
requirements. Do not weaken policy based solely on extension noise or warnings.

Installed framework source supports an empty root shell behind Suspense and parses
request CSP for nonces. This establishes candidate feasibility only. Production
nonce configuration is rejected until a separate reviewed promotion after evidence.
Rollback changes the affected CSP mode/policy without removing authorization,
public CSP, unrelated headers, or caching behavior.

## Acceptance criteria

These are runtime/Preview release gates; automated pre-commit checks alone do not
satisfy them:

- Public eligible static HTML/PPR shells and revalidation behave as before; no private
  session/data enters public artifacts or shared caches.
- Public hydration, theme, map, SVGs/images, grid, animation, and navigation work.
- Public inline event handlers are blocked under enforcement; permitted inline script
  elements and shared-origin XSS risks are explicitly acknowledged.
- Administrator identity checks fail closed before reads/writes/storage access.
  Forged/expired cookies recover without loops; non-admin users receive access denial.
- Preview nonce candidate has fresh secure nonces on generated/inline scripts,
  including theme, streaming, action refreshes, navigation, and errors.
- Login/logout, CRUD/reordering, images/icons, menus/dialogs, Server Actions, and cache
  invalidation remain functional under actual enforcement.
- One policy owner per document section; no hidden deployment-header collisions.
- Protected Preview evidence precedes staged authorized production activation.

## Verification commands and operational steps

Respect `AGENTS.md`: do not execute checks until the user requests a commit. At that
point the required dedicated verification subagent runs status/diff, formatting,
lint, TypeScript, Vitest, spelling, Knip, dependency boundaries, and final build.
Warnings block the commit unless documented as confirmed false positives.

For separately authorized production-mode browser validation against an existing,
protected Preview (or local production build), supply `CSP_TEST_BASE_URL` via the
environment and run:

```bash
pnpm exec playwright test --config playwright.csp.config.ts
```

Optional dedicated test credentials and Preview automation bypass are environment
values, never source/command literals. Do not store authenticated traces or private
request contents. Missing credentials/enforcement produce skipped tests, not passed
gates. Use the full manual rendering/cache/navigation/CRUD/security matrix and
rollback procedure in `AGENTS-SECURITY-REFERENCE.md`.

Record automated pre-commit check results separately. Protected Preview rollout
and production readiness gates remain pending.
