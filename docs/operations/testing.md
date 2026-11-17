# Application testing inventory

Authorized local verification on 2026-10-20 passed all 606 Vitest tests across
61 files and all configured coverage thresholds, with 82.5% overall line coverage.
Migration replay and the isolated production build also passed. At that baseline,
browser journeys and remote service contracts still required their first run. All original 49 Vitest
test source files, including the seven colocated files, are retained. Only the
unrelated external Playwright example was removed.

These results describe the 2026-10-20 baseline. On 2026-11-08, an explicit commit
request authorized fresh CircleCI-migration verification: the dedicated subagent
passed all nine root checks, including 798 Vitest tests across 74 files and the
production build. Implementation commit `fc23790` also passed the complete local
production Playwright gate: 180 tests across API, desktop and mobile projects,
with no retries. Hosted CircleCI, Preview, remote contracts and release acceptance
remain separate unproven obligations in the migration checklist.

## Developer setup

Run these setup steps in your local clone, using Node 24 and pnpm 12.18.0:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm icons:manifest
pnpm hooks:install
pnpm exec playwright install --with-deps chromium firefox webkit
```

Install OpenSSL through your operating system as well. Linux system-library
installation may require sudo; it belongs to setup, never a commit/push hook.
Repeat the browser install when the pinned Playwright version changes. Local
browser installations are reused; no browser is installed or cached in CircleCI.
Husky must be installed explicitly in each clone/worktree because lifecycle
scripts are disabled. These instructions do not authorize agents to run checks
on implementation approval.

The pre-commit hook runs lint-staged. Pre-push runs `pnpm test:e2e:local`, the
complete production suite. There is no previous-result reuse,
documentation-only exemption or browser subset at pre-push. Missing browsers,
ports, certificates or a failed test blocks the push. Do not work around
failures with `HUSKY=0` or `--no-verify`. GitHub web edits/bot-created commits do
not invoke local hooks; arrange local verification during owner review.

## Generated icon catalogue

The admin picker imports `lib/react-icons-manifest.json`. This file is generated
from the ten supported installed `react-icons` packs and is ignored by Git.
Development, build, lint, type checking, dependency analysis, lint-staged and
Vitest scripts run `pnpm icons:manifest` explicitly before their consumer. The
generator preserves unchanged content and modification times; changed catalogues
are published atomically. A generation failure stops the consuming command.

For tools invoked directly, prepare the catalogue with `pnpm icons:manifest`
first. This includes the direct TypeScript and Vitest commands in the authorized
pre-commit pass; retain all nine checks and the dedicated subagent policy.
Dependency changes during a running development session require explicit
regeneration or restarting `pnpm dev`. Installation alone does not generate it.

Every CircleCI job using the shared install command generates its own catalogue
after its frozen install. CircleCI does not publish that JSON to Vercel.
Preview and production candidate builds generate it independently through
`pnpm build`, which runs generation before Next.js. The isolated production
harness runs the same generation and Next.js build steps separately so only Next.js
receives its network preload. Each build workspace stores the source JSON
at `lib/react-icons-manifest.json`; Next.js compiles its imported data into the
application assets. The raw JSON is not a public endpoint or persistent runtime
file. No database or Blob storage is used.

Generation runs before every build, without version detection or restored
manifest caches. `pnpm start`, deployment promotion and rollback reuse the built
catalogue; they do not regenerate it. Each deployment retains the catalogue
matching its own installed dependencies.

## Execution and infrastructure

- `pnpm test` remains Vitest watch mode. `test:run`, `test:unit`, `test:component`,
  `test:integration` and `test:coverage` retain their project/coverage scope.
  CircleCI uses one-shot coverage plus JUnit results; agents run local checks only
  under the root explicit-commit policy.
- `pnpm test:e2e:local` builds once, probes production HTTP, then runs every
  configured API/desktop/mobile/CSP project through local HTTPS. It runs at every
  push. `test:e2e:prod` remains a local compatibility alias.
- `pnpm test:api` uses that local production runner with only the API project for
  explicitly authorized diagnosis; pre-push does not use that subset.
- `pnpm test:e2e` remains the local public development test entry point. It does
  not replace complete production verification before push.
- `pnpm ci:build` runs the same synthetic build/HTTP/HTTPS lifecycle without
  Playwright, only in automated CI or explicitly authorized verification.
- `pnpm migrate:check` replays migration prefixes and schema drift in CircleCI.
  `pnpm test:contract` stays opt-in behind the trusted main contract controller;
  ordinary tests never use remote provider credentials.

CircleCI has no restore caches and no browser execution/downloads. The complete
local browser suite retains Chromium, Firefox, WebKit, mobile Chromium and the
API project, eight shared workers, one diagnostic retry and `failOnFlakyTests`. Missing
required auth/CSP prerequisites fail; do not add skips or retries to hide failures.
Global/project `fullyParallel` remains false; audited specs/describes explicitly opt
into parallel execution. The source inventory contains 192 project executions:
API 4, CMS 68, CSP 20, public accessibility/navigation 12 and responsive behavior 88.
This is the expected discovery count, not a new recorded execution result.

The shared harness uses `.ci/next-production` instead of deleting `.next`, restores
`next-env.d.ts`, and removes its owned database/build/lock on normal success,
failure or handled interruption. It serializes local harnesses with
`.ci/production-harness.lock` and records the owner PID there. Ports 3001 and 3443
must be available. After a hard kill, confirm that recorded process and its owned
servers have stopped before removing a stale lock; never remove a live run's lock
or kill an unrelated service. A failed `finally`/machine interruption may require
manual cleanup of only that invocation's resources.

Each integration fixture owns a temporary migrated file DB, synthetic users with
real better-auth hashing and foreign keys. Build/runtime receive explicit fixture
settings, not production credentials. Both production entry points set `APP_ENV=test`
and `PORTFOLIO_TEST_BUILD=true` for fixture guards, with an owned `.ci/database-*`
directory and no Vercel runtime. Neither fabricates `CI`; inherited CI metadata does
not select fixture behavior. Cloud build uses the same guards without Playwright.
The isolated build retains its explicit one-CPU setting and fresh output.
`NEXT_TELEMETRY_DISABLED=1` prevents host telemetry preferences from changing the
allowed network behavior.

The harness probes `next start`, then starts the same build with a local one-day
certificate at the correct HTTPS origin. Only the local probe/browser trusts that
certificate; TLS/CSRF/SSRF protections are not disabled. Public font downloads may
occur during build; application providers use deterministic fixtures. No test
endpoint or public authentication bypass is added.

The isolated HTTPS server keeps the performance epoch aligned with the host wall
clock. Next's cache handlers mix those clocks; a host clock correction can otherwise
leave invalidated entries temporarily fresh. The monotonic duration clock and the
application's wall clock retain their normal behavior. This adjustment is confined
to the guarded synthetic server and does not change deployed caching.

Last.fm/Blob fixtures, synthetic Carto responses and real public-DNS/SSRF validation
for the explicit example URL remain intact.
Remote contracts create empty owned nonproduction Turso resources and Blob objects;
SQLite fixtures do not establish remote transport fidelity.

## Parallel browser resources

One HTTPS production server and one temporary database serve all five projects.
Native Playwright locks apply across files, workers and projects. Keep names global,
without project/worker suffixes. Locks are declared on individual parallel tests,
covering setup, assertions and restoration; default/serial groups can hold locks
for their entire execution group. No current test requires an exclusive suite lock
or depends on a previous test having run.

- `cms-projects`: project CRUD, project keyboard ordering, OG image replacement,
  delayed public cache miss, admin read failure/recovery, OG error/pending
  notifications and rejected OG requests. These are every current authenticated
  project-list workflow affected by the admin fault, collection ordering and every
  current OG-directory writer. The existing lock also protects OG-directory deltas;
  do not add a redundant Blob lock.
- `cms-social-links`: link CRUD, icon selection/public rendering and link keyboard
  ordering. These share collection positions and order allocation.
- `cms-settings`: settings save/cache invalidation and unauthorized replay. All
  browser copies edit the singleton row and assert the exact saved value.
- `blob-skill-icons`: invalid SVG, normalized upload, replacement and deletion in
  the custom SVG journey. Whole-directory assertions require coordination among
  its four browser copies; ordinary skill CRUD does not upload files.
- `music-scenario`: provider failure/recovery and administrative music status.
  Restore the empty provider scenario and refresh the shared cache before release.

Public tests remain unlocked: they assert valid layout, document-local navigation,
accessibility and policy rather than exact mutable CMS values. Shallow section
navigation retains each document's card data. Both music scenarios return a null
public track. Add coordination if future assertions require an exact shared value.

Project reads use distinct `db.projects.read.admin` and `db.projects.read.public`
operation names. The failure scenario affects only admin reads protected by
`cms-projects`; public latency remains bounded to 2000 ms and returns real SQL data.
Scenario changes and resets atomically rename complete files into place, avoiding
partial JSON or unknown provider scenarios under concurrent reads.

Each attempt derives its content namespace and synthetic client address from project,
test ID, repetition and retry. Client headers apply to browser/API contexts, including
the independent replay context. IPv6 identities differ within their `/64` prefixes
because better-auth normalizes that range. Cookies and sessions remain per context;
logout invalidates only the presented session. No shared auth storage file is used.
API-only tests create no browser context. CMS cleanup deletes only owned rows,
restores settings through real actions and restores ordering before deleting its row.

## Local execution timing and acceptance

These commands remain subject to the root commit/push verification policy; editing
or approving implementation does not authorize running them. All complete browser
acceptance remains local, including repeated runs. Never reuse a benchmark as the
fresh gate required for a later push.

Authorized discovery without CI:

```sh
env -u CI APP_ENV=test PORTFOLIO_TEST_BUILD=true \
  PLAYWRIGHT_BASE_URL=https://localhost:3443 \
  CSP_TEST_BASE_URL=https://localhost:3443 \
  pnpm exec playwright test --list
```

Expect API 4 and 47 cases per browser, with no unexpected skips or missing cases.
Project and grep filters remain available; production runner arguments are forwarded
unchanged. `--workers=1` remains available for an explicit diagnostic comparison,
while an ordinary pre-push invocation uses eight workers in one Playwright run.

```sh
env -u CI pnpm test:e2e:local
env -u CI pnpm test:e2e:local --workers=1
env -u CI pnpm test:e2e:local --workers=8 --repeat-each=3 --shuffle=5800
```

Record shell wall-clock time for the complete command, for example
`time env -u CI pnpm test:e2e:local`, as the total pre-push gate measurement. The
internal harness total excludes package-manager/loader startup and report writing.

Use three fresh complete runs per comparison configuration and one repeated/shuffled
run (576 cases). Require zero unexpected failures, skips or flaky outcomes. Compare
the previous sequential revision with equivalent instrumentation and conditions;
the current revision with `--workers=1` is an additional scheduling control.
Keep the same hardware/power conditions, dependencies, browsers and complete test
selection, and run harnesses sequentially. Do not restore build caches or omit phases.

The harness records sanitized monotonic phase durations in `.ci/e2e-timings.json`:
fixture database, certificate, icon generation, build, HTTP startup/smoke, HTTPS
readiness, Playwright, application shutdown and cleanup, plus harness duration/status. Preserve the file
after each successful run before the next invocation overwrites it. The isolated
JSON reporter writes `test-results/playwright.json` alongside HTML/JUnit evidence.
Use result start times/durations to confirm intra-file overlap, the eight-worker
budget and non-overlapping locked tests across projects, including setup/teardown.
Keep reports local; never copy fixture databases, TLS keys, environment files or
browser storage state into benchmark artifacts.

Report medians/ranges separately for build, startup/readiness, Playwright and total
gate duration. Verify cleanup and shared-state restoration under repetitions, and
confirm lock refusal and handled-interruption cleanup during authorized acceptance.
Do not increase retries/timeouts or weaken assertions to obtain a performance result.
Build duration is a fixed cost of this architecture; build optimization is separate.
No new performance or concurrency acceptance result is claimed by this source change.

## Network fixture ownership

MSW is a development dependency. The Last.fm and Spotify artwork suites opt into
`tests/fixtures/setup-network.ts`, using shared endpoint constants and typed payload
builders from `tests/fixtures/music.ts`. Tests declare exceptional responses beside
their assertions. Interception starts before the suite, response overrides reset
after every test, and interception closes afterward. Unexpected HTTP destinations
and handler exceptions are recorded independently of application error handling
and fail teardown. Diagnostics contain methods and origins, without credentials,
query strings or request bodies. Provider success, parsing, validation and fallback
code runs normally; Spotify browser search remains mocked at its browser boundary.
Injected-fetch deadline tests remain independent of MSW.

The shared production fixtures use the same response definitions and strict network
server. `scripts/preload-network.mjs` registers the existing TypeScript loader and
starts interception once in each isolated Next.js process. The harness passes this
preload through child-specific `NODE_OPTIONS` to its build, inherited build workers,
HTTP server and HTTPS server. Package installation, icon generation, Playwright,
ordinary development and hosted deployment commands receive no preload.
There is no application instrumentation import or browser worker asset. A dependency
boundary rule prevents deployed source from importing MSW or its network helpers.

Startup requires `APP_ENV=test`, `PORTFOLIO_TEST_BUILD=true`, no `VERCEL`,
an owned `.ci/database-*` fixture directory and an explicit build/runtime network
phase. Last.fm reads `music.txt` on every request, preserving empty/failure/recovery
scenarios. Blob and exact OG URL handlers delegate to the existing guarded fixtures.
Local application requests pass through. Only the build phase allows HTTPS GETs to
`fonts.googleapis.com` and `fonts.gstatic.com` for Next.js font downloads; runtime
font requests and other unexpected destinations fail.

The harness initializes `network-failures.txt` inside its temporary fixture directory.
Blocked requests and handler exceptions append sanitized diagnostics synchronously.
The parent checks that file after the build and after stopping each application
server, preventing a caught request error from yielding a successful harness run.
Normal fixture cleanup removes it with the database directory.

Verification follows the root explicit-commit policy: all nine checks through the
required dedicated subagent, plus a fresh complete local Playwright gate for each
push. Changes to preload startup must include the child-process and worker
fixture tests. Inspect the ordinary production build's browser assets, server chunks
and deployment trace files for MSW/network-preload inclusion; the isolated build
intentionally uses the external preload.

## Hosted Preview acceptance

Run authenticated hosted acceptance locally against a disposable synthetic Preview.
Load the documented Preview/controller credentials from a private ignored env file
or credential manager. The owner-operated Node 24 entry point can load that file:

```sh
pnpm exec tsx --env-file=.env.preview-acceptance scripts/preview-acceptance.mts
```

Use the dedicated preview-acceptance `VERCEL_AUTOMATION_BYPASS_SECRET` here,
following the [four-secret mapping](./circleci.md#preserve-the-four-automation-bypass-secrets).

Alternatively, export those values privately and run `pnpm test:preview`. Required
values are `DEPLOYMENT_ID`, `GITHUB_REPOSITORY`, `GITHUB_REPOSITORY_ID`, a read-only
`GITHUB_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`, `VERCEL_TOKEN`,
`VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_ADMIN_EMAIL` and
`PREVIEW_ADMIN_PASSWORD`. Never point it at production or place credentials in
pipeline parameters or shell history.

The wrapper verifies Vercel repository/project/source/age and current owned branch
identity before passing its exact origin to `playwright.csp.config.ts`. Existing
fixtures bootstrap an origin-bound bypass cookie with redirects disabled, never
global bypass headers. Traces, screenshots and video remain off. Do not publish
local authenticated reports or browser state. Automatic cloud Preview validation
performs only bounded HTTP smoke; it never receives administrator credentials.

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
| High: URL/SSRF/CSP (`lib/security/*`, `lib/og-image.ts`, `proxy.ts`)                                                                       | DNS/IP/redirect/body/magic-byte/nonce/header/spoof tests                                                | Project Blob ownership, production enforced CSP/hydration and forged cookie flows                                                                                            | External redirects/private IPs/oversized bodies blocked; nonces fresh, script attributes blocked; public cache remains static; no unsafe-eval in production             |
| High: production release (`scripts/{platform,approval,release,smoke}.mts`)                                                                 | No controller existed                                                                                   | Pure API-origin/SHA/ID/approval boundary unit tests; workflow preflight/finding gates; owner platform drills                                                                 | No arbitrary API token destination; no missing human gate; exact main SHA/candidate verified before and after wait; missing evidence blocks                             |
| High: privacy and diagnostics (`lib/observability/*`, request error boundary)                                                              | Allowlisted provider diagnostics                                                                        | Log allowlist unit tests, database error sanitization and client error-boundary recovery                                                                                     | No raw token/body/session/record leakage; generic error screens; classified unexpected returned errors logged                                                           |
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
- The passing local production suite covers streaming, keyboard drag, CSP and
  browser journeys for the tested fixture state. It does not establish hosted
  platform API behavior. Later failures require fixes, not skips or retries.
- Synthetic build/local fixtures do not establish hosted Vercel CDN/nonce behavior,
  Turso replication consistency or real Blob limits. Protected
  contracts, Preview acceptance and owner release drills supply that evidence.
- Remote contracts exercise essential SQL/SDK transport operations, not a complete
  remote copy of every CMS journey. Preview acceptance currently runs CSP/auth flows;
  local production E2E supplies destructive CMS workflows with owned fixtures.
- No automated app test proves physical host CPU/memory or every client browser.
  No real production-content mutations are used for smoke testing.
