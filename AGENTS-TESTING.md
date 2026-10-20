# Testing

The root local-verification restriction applies to every command in this guide.
Agents run checks only after an explicit request to commit, through the unchanged
pre-commit process. GitHub Actions runs them automatically in its separate context.

Read `.claude/skills/vitest/SKILL.md` before writing Vitest tests and
`.claude/skills/playwright-best-practices/SKILL.md` before writing Playwright tests.
Current configuration/source takes precedence over older skill version examples.

## Test ownership

- `vitest.config.mts`: Node unit, jsdom component and real-database integration projects.
- `vitest.contract.config.mts`: opt-in external-service contracts; never default tests.
- `playwright.config.ts`: public development checks or full isolated production suite.
- `playwright.csp.config.ts`: explicit protected Preview CSP/auth acceptance.
- [Coverage inventory](./docs/operations/testing.md): production files, existing/new
  coverage, infrastructure, expected failures, risk targets and limitations.
- [Reference](./AGENTS-TESTING-REFERENCE.md): implementation patterns and entry points.

Preserve colocated tests as well as `tests/`. `pnpm test` stays watch mode. CI uses
one-shot commands and production-mode E2E, never just `next dev`.

## Required levels

| Area                                                          | Level                              |
| ------------------------------------------------------------- | ---------------------------------- |
| Utilities, normalization, schemas and security policy         | Unit                               |
| Interactive React clients, forms, pending/error feedback      | RTL component                      |
| Real data facades, transactions, constraints and auth adapter | Migrated libSQL integration        |
| Route Handler HTTP behavior, sessions, CSRF, health           | Production API + integration       |
| Async RSC, actions, navigation, CMS, caching, streaming       | Production Playwright              |
| Turso/Blob transport fidelity                                 | Protected remote service contracts |

Declarative better-auth configuration is not an exemption from authentication tests.
Next.js itself is upstream-tested, but this application's use of caching, boundaries,
streaming and authorization must be tested. Async RSCs use browser tests, not RTL.
Do not invent checkout, education, MFA or tenant features that do not exist.

## Test design

Use real observable behavior, accessible roles/names, deterministic fixtures, and
negative cases. Authenticate, authorize and validate independently of UI/proxy checks.
Test rollback, missing/invalid inputs, CAS conflicts, cleanup, and safe errors where
those behaviors exist. Never assert arbitrary implementation calls instead of real
persistence when an integration fixture is appropriate.

Unit tests may mock database/auth/Next boundaries. Integration tests use
`tests/fixtures/database.ts` with complete committed migrations and per-test files.
Do not mock Drizzle in a test claiming database integration. Close clients and clean
owned fixtures even on failure. Public cached reads must not acquire auth state.

Production E2E requires `CI=true`, an owned temporary database, safe build/runtime
environment, local HTTPS and no Vercel runtime. The runner initializes these. Test
fixtures must never add public test endpoints, disable auth/CSRF/SSRF, accept arbitrary
runtime hosts, or write to production Turso/Blob. The real SQL and better-auth paths
remain active. Network/provider/Blob fixture limits are documented in the inventory.

Use semantic Playwright locators; use structural selectors only where the thing
under test has no semantic role (e.g. rendered SVG). Avoid fixed sleeps. One retry
collects diagnostics; `failOnFlakyTests` prevents retries from hiding failures.
Required tests must fail if prerequisites are missing rather than skip silently.

## Coverage and diagnostics

Risk gates live in Vitest configuration. Do not lower them, suppress failures or
exclude high-risk modules merely to get green CI. Report untested code, actual
coverage and production E2E evidence together. UI coverage is reported, not forced
to an arbitrary 100%. Radix/shadcn primitives remain upstream-owned.

Only synthetic local tests may record traces/screenshots. Remote authentication
and production smoke probes must not record storage state, cookies, bodies, private
records or credentials. Never upload databases, TLS private keys or environment files.
Accessibility automation supplements manual keyboard/screen-reader/contrast review.
