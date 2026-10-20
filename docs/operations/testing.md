# Application testing inventory

Authorized local verification on 2026-10-20 passed all 606 Vitest tests across
61 files and all configured coverage thresholds, with 82.5% overall line coverage.
Migration replay and the isolated production build also passed. Browser journeys
and remote service contracts still require their first run. All original 49 Vitest
test source files, including the seven colocated files, are retained. Only the
unrelated external Playwright example was removed.

## Execution and infrastructure

| Command                 | Scope / infrastructure                                                                     | Execution context                                               |
| ----------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `pnpm test`             | Vitest watch; existing developer behavior retained                                         | Human development; agents require explicit commit authorization |
| `pnpm test:run`         | One-shot unit, component and integration projects                                          | CI or authorized pre-commit work                                |
| `pnpm test:unit`        | Node utilities, schemas, mocked action/security tests; colocated lib tests retained        | Same restriction                                                |
| `pnpm test:component`   | jsdom + RTL, user-event and jest-dom; hooks, clients and colocated component/theme tests   | Same restriction                                                |
| `pnpm test:integration` | Real migrated local libSQL; complete schema, real queries/mutations/auth                   | Same restriction                                                |
| `pnpm test:coverage`    | All Vitest projects, V8, HTML/LCOV/JSON summaries, risk gates                              | CI Tests job                                                    |
| `pnpm test:e2e`         | Existing development server or configured base URL; nondestructive public tests by default | Human use or authorized verification                            |
| `pnpm test:e2e:prod`    | Fresh build, `next start`, HTTPS harness, all browsers/API and synthetic DB                | Secret-free isolated CI process                                 |
| `pnpm test:api`         | Same production runner, API project only; not duplicated in full CI                        | Targeted authorized diagnosis                                   |
| `pnpm test:contract`    | External Turso/Blob fidelity, separate configuration                                       | Protected service-contract workflow only                        |
| `pnpm migrate:check`    | All migration prefixes, latest replay/idempotency, schema generation drift                 | CI Migrations job                                               |

CI has no caches. Browser binaries are installed fresh. A single worker starts with
Chromium, Firefox, WebKit and mobile Chromium. One retry gathers diagnostics;
`failOnFlakyTests` makes a recovered flaky failure block CI. Fix causes rather than
raising retries. No required CSP/auth test silently skips missing prerequisites.

Every integration fixture owns a temporary file DB, applies committed migrations,
seeds synthetic records/users with real better-auth password hashing, enables foreign
keys, and closes/removes its connection/files. No production token is available.
Remote contracts create empty disposable Turso databases in a separate `ci-*` group;
local SQLite fidelity is not assumed to prove remote behavior.

The production runner supplies an explicit safe environment to both build/runtime,
smoke-tests `next start` on loopback, then starts the same production output in a
small HTTPS harness with the correct external origin and a one-day certificate.
The installed CLI has no production HTTPS flag; preserving the real request origin
avoids weakening the application's existing CSRF checks for a reverse proxy.
Only that local browser/probe accepts its self-signed certificate; no global TLS
validation is disabled. Next/font can download public fonts at build time; provider
calls during application tests are fixtures. Runtime fixture activation requires
`CI=true`, `APP_ENV=test`, an owned `.ci/database-*` directory, and no Vercel runtime.
There is no test HTTP endpoint, authentication bypass or weakened SSRF validation.

Last.fm errors/latency and Blob writes use deterministic filesystem fixtures.
Successful OG acquisition retains real public-DNS/SSRF validation for an explicit
`example.com` fixture URL; HTTP content is deterministic. Carto style responses are
synthetic in browsers; unexpected external browser/application requests fail tests.
Untrusted PRs never receive remote contracts, Preview credentials or production data.

## Risk and coverage matrix

| Risk / real module                                                                                                                         | Existing evidence                                                                                       | Added coverage / level                                                                                                                                                       | Failure behavior and acceptance                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical: stable administrator identity (`lib/admin.ts`, `server-session.ts`, `security/admin-allowlist.ts`)                               | `tests/security/admin*`, proxy tests                                                                    | Real auth integration + CMS API/browser access/replay tests                                                                                                                  | Missing/forged/non-admin sessions never mutate or reveal CMS records; cookie presence is not authorization                                                              |
| Critical: auth configuration and handlers (`lib/auth-config.ts`, `auth.ts`, `app/api/auth/[...all]/route.ts`, clear-invalid-session route) | URL/security tests; manual-only auth guide                                                              | Real better-auth/Drizzle login, logout, expired signed token, missing/forged session, disabled signup, CSRF/origin and persistent limiter integration; production HTTP tests | Wrong password 401, disabled signup 400, foreign-origin mutation 403; logout removes session; expired token rejected without cookie cache; generic login errors         |
| Critical: project mutations (`lib/actions/projects.ts`)                                                                                    | `tests/actions/project-images.test.ts`, unauthorized operation tests                                    | Migrated SQL create/update/delete, relation replacement, rollback on invalid FK, gap-normalizing transactional order; production browser CRUD/order/OG replacement           | No partial parent/junction save; old image preserved on failure; CAS prevents concurrent overwrite; only owned Blob paths deleted; cache tags invalidated after success |
| Critical: experience mutations (`lib/actions/experiences.ts`)                                                                              | Unauthorized operation tests, schema tests                                                              | Real SQL CRUD, relation clearing and rollback, missing IDs, production form CRUD                                                                                             | Invalid dates/IDs fail; failed associations roll back parent; deletion cascades junctions                                                                               |
| Critical: settings/history (`lib/actions/settings.ts`)                                                                                     | Schema and auth boundaries                                                                              | Real SQL transition/no-op/history, forced write rollback; production settings/public freshness and forged/non-admin action replay                                            | Exactly one history event per state change; no event on rolled-back save; unauthorized replay leaves public state unchanged                                             |
| Critical: skill SVG/storage (`lib/actions/skills.ts`, `lib/skill-icons/{svg,storage}.ts`, `lib/blob.ts`)                                   | Extensive action, SVG parsing, file limit and storage mock tests                                        | Complete-schema CRUD/cascades; production invalid SVG and successful upload/replacement/deletion; token/store remote contract                                                | Closed SVG vocabulary, size/mime checks, no events/external references; immutable ownership URLs; orphan cleanup; no production store writes                            |
| High: social links and ordering (`lib/actions/social-links.ts`)                                                                            | Action/schema/component tests and actual-SQL focused ordering test                                      | Full migrated DB CRUD/order and production browser CRUD/keyboard order                                                                                                       | Color/URL validation; stable ordering after reload; failed order transaction does not partially reorder                                                                 |
| High: data facades (`lib/queries/{projects,experiences,skills,social-links,settings,about-me}.ts`)                                         | Used-skill SQL tests and auth boundaries                                                                | Real joins, sorted data, union usage counts, filtering of unused skills and skills without icons, public projection, private query guards                                    | No auth state in public cache keys; private data excluded; invalid/missing lookup safe; deterministic ordering                                                          |
| High: migrations/schema (`db/client.ts`, `db/schema/*`, `db/migrations/*`, `scripts/database.mts`)                                         | Six committed SQL migrations; no full-chain CI                                                          | Fresh and every-prefix replay, reapplication/drift gate, actual FK/unique/cascade/rollback tests; remote constraint/transaction contracts                                    | Unknown ledger/drift/destructive production SQL fails closed; no startup schema push; data retained on reapply                                                          |
| High: URL/SSRF/CSP (`lib/security/*`, `lib/og-image.ts`, `proxy.ts`)                                                                       | DNS/IP/redirect/body/magic-byte/nonce/header/spoof tests                                                | Project Blob ownership, Sentry origin policy, production enforced CSP/hydration and forged cookie flows                                                                      | External redirects/private IPs/oversized bodies blocked; nonces fresh, script attributes blocked; public cache remains static; no unsafe-eval in production             |
| High: production release (`scripts/{platform,approval,release,smoke}.mts`)                                                                 | No controller existed                                                                                   | Pure API-origin/SHA/ID/approval boundary unit tests; workflow preflight/finding gates; owner platform drills                                                                 | No arbitrary API token destination; no missing human gate; exact main SHA/candidate verified before and after wait; missing evidence blocks                             |
| High: privacy and telemetry (`lib/observability/*`, instrumentation files)                                                                 | Allowlisted provider diagnostics                                                                        | Scrubbing/log allowlist unit tests, client error-boundary behavior; owner synthetic Sentry/source-map exercise                                                               | No raw token/body/session/record leakage; no duplicate digest error capture; classified unexpected returned errors captured                                             |
| High: public runtime caching (`cache-tags.ts`, public query facades, `app/(public)/page.tsx`)                                              | Cache code present; mostly mocks                                                                        | Production settings mutation→public freshness; production delayed query cache miss/loading and data; SQL tag assertions                                                      | Real `next build`/`next start`; stale content replaced after authorized mutation; no per-user state in public entries                                                   |
| High: async RSC, Suspense/error recovery (`app/(public)/page.tsx`, `components/loading/*`, route errors)                                   | Skeleton implementation; no RSC unit tests                                                              | Production delayed real SQL and generic server-read error/reset journeys                                                                                                     | Loading appears before delayed content; resolved content replaces fallback; private SQL details never rendered; reset recovers                                          |
| High: provider degradation (`lib/queries/last-fm.ts`, music request/diagnostic/schema files, Spotify scraper/oEmbed/URL helpers)           | Colocated last.fm and Spotify tests, mocked admin music/action tests                                    | Production Last.fm failure→refresh→recovery; safe hosted browser fallback                                                                                                    | Public fallback survives; admin diagnostics actionable but allowlisted; no API key in messages; Vercel does not assume Chromium installation                            |
| Medium: login and feedback (`components/auth/login.tsx`, logout, invalid-session form)                                                     | No login component tests                                                                                | RTL pending/error/reset; production wrong credentials/login/logout and replay                                                                                                | Disable duplicate pending submit, expose role=alert, restore button on thrown network failure, generic feedback                                                         |
| Medium: CMS clients (`components/admin/{skill-form,social-link-form,projects-dashboard,color-picker,music-status-panel,...}.tsx`)          | Existing component tests cover fields, state, sorting rollback, colors, feedback                        | Shared error component tests and real browser forms/validation/actions                                                                                                       | Observable success/error/pending behavior; semantic names/roles; native validation works                                                                                |
| Medium: public clients (`components/public/*`)                                                                                             | Grid/layout/transition/media/theme/skills/cards/hobbies tests, colocated switcher and skills-pill tests | Existing responsive tests retained and baseURL fixed; public/login axe, navigation/404 and production hydration/CSP                                                          | Navigation/history/focus/reflow, touch targets and theme work in real browsers; automated WCAG failures block                                                           |
| Medium: pure utilities (`lib/utils.ts`, colors, OG feedback, provider URLs/status)                                                         | Existing OG feedback/music URL/color behavior in component suites                                       | `cn`, Spanish formatting and invalid-date tests; library tests retained                                                                                                      | Input normalization/boundaries deterministic; UTC CI fixtures avoid date rollover ambiguity                                                                             |
| High: health (`app/api/health/route.ts`, `ready/route.ts`)                                                                                 | None                                                                                                    | Production API liveness identity/no-store; readiness unauthorized/wrong/valid token checks                                                                                   | No dependency work for liveness; readiness SQL/schema/ledger batch bounded, 401/200/503 generic; no infrastructure details exposed                                      |

## Inventory of actual journeys

The public site is `/` with section navigation, portfolio/project/experience cards,
skills, profile/resume/status, social links, theme, hobbies/map and optional music.
Admin routes are `/login`, `/dashboard`, projects/experiences/skills/social-links
list/new/[id]/edit, `/dashboard/settings`, and `/dashboard/music-status`.
The only pre-existing HTTP Route Handlers were better-auth and invalid-session
cleanup; health/readiness are added here. CMS writes are Server Actions, not invented
REST CRUD endpoints. Project/experience image _file uploads_, education, checkout,
payments, OAuth, MFA, registration onboarding, password-reset email, tenants and
cross-tenant permissions are **Not Applicable** to the current application.
Project OG image acquisition and skill SVG file uploads are applicable and tested.

## Coverage gates and remaining limits

- Security/validation/admin targets: 90% statements/lines/functions, 85% branches.
- Server Action target: 85% statements/lines/functions, 80% branches.
- All library/component sources are reported, including unimported files. UI
  primitives are upstream-owned and excluded; no arbitrary global 100% target.
- Measured query/storage coverage must be reviewed alongside E2E evidence. Browser
  RSC coverage is not fabricated as a Vitest line percentage. Missing high-risk
  branches are blockers for follow-up coverage; do not lower gates just to pass.
- New production tests need their first actual run. Streaming timing, keyboard drag
  behavior, strict CSP, font downloads and platform API schema assumptions are not
  proven by code review alone. Failures require fixes, not skips or retries.
- CI local fixtures do not establish hosted Vercel CDN/nonce/source-map behavior,
  Turso replication consistency, real Blob limits or alert delivery. Protected
  contracts, Preview acceptance and owner release drills supply that evidence.
- Remote contracts exercise essential SQL/SDK transport operations, not a complete
  remote copy of every CMS journey. Preview acceptance currently runs CSP/auth flows;
  local production E2E supplies destructive CMS workflows with owned fixtures.
- No automated app test proves physical host CPU/memory or every client browser.
  No real production-content mutations are used for smoke testing.
