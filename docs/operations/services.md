# Turso, Blob, Sentry and monitoring setup

## Turso and Drizzle

The existing schema is in `db/schema/portfolio.ts` and `better-auth.ts`. Historical
migrations `0000`–`0005` are retained. The additive `0006_auth_rate_limits` migration
adds persistent better-auth counters; `rateLimits` maps through the plural Drizzle
adapter. The five-minute signed session cookie cache is retained. Explicit logout
clears its browser cookies; out-of-band session revocation can take up to five
minutes to affect another cached session. This is an acknowledged security tradeoff.

1. Identify the actual production database and its migration ledger privately.
   Do not assume prior `drizzle-kit push` created `__drizzle_migrations`.
2. Create independent Preview and contract databases in nonproduction groups. Name
   the contract group `ci-contracts` (or another `ci-*` group). Prefer an independent
   nonproduction Turso organization if its API token otherwise grants production
   management access. Group tokens can cover more than one DB; choose database-
   scoped application tokens and do not reuse production group credentials.
3. Grant the `service-contracts` environment only that nonproduction organization's
   API token. The controller creates a fresh empty `ci-<run>-<suffix>` DB, applies
   committed migrations, runs transport/constraint tests and deletes only its owned
   DB. It never forks production data. Check database count/quota before activation.
4. Create Preview's dedicated synthetic administrator with the
   [Preview account setup command](#create-the-preview-administrator). It uses
   better-auth password hashing while public registration stays disabled. Put its
   stable user ID in Preview `ADMIN_USER_IDS`; keep production's allowlist independent.
5. Prepare recovery before any production migration: confirm the current Turso
   retention/window in your plan and record a recovery point or verified backup.
   Free's documented PITR window is limited (24 hours at investigation); confirm the
   actual entitlement rather than relying on a historic plan. Secure exported
   backups contain private records and must not be GitHub artifacts.
6. If the production schema exists without a ledger, dispatch Release with operation
   `baseline`, the current main SHA, a recovery reference, and exact `baseline_tag`
   (normally `0005_custom_skill_icon` if schema matches). Approve the protected
   `production-migrations` job. The tool reconstructs that prefix, compares schema
   definitions exactly and writes only ledger metadata. Any mismatch stops. Do not
   force a match or mark unknown SQL as applied. Reconcile drift with a reviewed
   migration/restore procedure and repeat comparison.
7. Future changes: edit schema → generate SQL → review it → append policy hash/kind
   → CI replay/drift checks → protected migration approval → compatible candidate
   → explicit promotion. No startup or Vercel-build production migrations.

The policy hash is SHA-256 of the exact committed SQL bytes. Append one policy entry
per journal entry. Old files/hashes are immutable. Production automation permits
only pending `expand` entries and rejects obvious destructive SQL and new required
columns without defaults. This guard supplements human SQL review; it is not a full
proof of semantic compatibility. A transaction serializes ledger reads/writes and
migration application; the global release concurrency group also prevents competing
workflow releases. All other migration writers must use the same controlled process.

CI uses separate local libSQL files, applies every supported prefix to the latest
schema, checks foreign keys and reapplication, and checks schema/snapshot drift in a
temporary directory. Local files do not establish remote replication/network,
transaction transport, service limits or failure fidelity. Protected remote contracts
cover essential Turso behavior and block release on service errors.

Use expand-and-contract: add nullable/defaulted schema first; deploy compatible code;
perform a reviewed, resumable backfill; verify old/new compatibility; remove obsolete
schema only in a later separately approved maintenance release. Contract entries are
blocked by the normal release controller. Do not relabel destructive SQL as expand.
No contract migration is introduced by this implementation.

Application rollback does not undo SQL. Turso recovery restores into a new database;
review URL/token changes and data-loss implications before switching the app. Keep
old application versions compatible with expanded schema. See [Drizzle migrations](https://orm.drizzle.team/docs/migrations),
[Turso Drizzle integration](https://orm.drizzle.team/docs/get-started/turso-existing),
[Turso recovery](https://docs.turso.tech/features/point-in-time-recovery),
and [database API](https://docs.turso.tech/api-reference/databases/create).

If a runner is forcibly stopped after resource creation, review `ci-<run>-*` resources
and `ci/<run>/` Blob objects. Cleanup retries compare the owned database ID and name;
never bulk-delete an entire group or store to clear an orphan. A failure before the
ownership record is written requires an owner reconciliation, not guessed deletion.

### Create the Preview administrator

Create a test login for the CMS in the isolated Preview database. Applying
migrations creates tables, but does not create a login account.
This account belongs to your application; it is separate from your Turso or Vercel
dashboard login and from your real production administrator.

After applying the committed migrations to Preview, add these two values to your
private `.env.preview.local` in the repository root:

```dotenv
PREVIEW_ADMIN_EMAIL=preview-admin@example.test
PREVIEW_ADMIN_PASSWORD="replace-with-a-new-unique-password"
```

Keep `APP_ENV=preview`, the isolated `TURSO_DATABASE_URL` and its database-scoped
`TURSO_AUTH_TOKEN` in that same file. Choose a password of 12–128 characters. The
email uses the reserved `example.test` domain; this application does not require a
verification email. The file is already excluded by `.gitignore`.

Run this from the checkout containing the setup script:

```bash
env -u APP_ENV -u TURSO_DATABASE_URL -u TURSO_AUTH_TOKEN \
  -u PREVIEW_ADMIN_EMAIL -u PREVIEW_ADMIN_PASSWORD \
  pnpm exec tsx --env-file=.env.preview.local scripts/provision-preview-admin.mts
```

The command displays the database hostname. Confirm that it is your isolated
Preview database, then type that hostname at the prompt. It creates the user and
its credential account in one transaction, hashing the password with Better Auth.
Repeating it with the same credentials returns the same ID; it does not reset an
existing password. It prints `ADMIN_USER_IDS=<new-user-id>` without printing the
password or database token.

Copy the printed ID to **Vercel → project → Settings → Environment Variables →
Preview → `ADMIN_USER_IDS`**, then create a new Preview deployment. For automated
Preview acceptance, copy this test email and password to **GitHub → repository →
Settings → Environments → `preview-acceptance` → Environment secrets** as
`PREVIEW_ADMIN_EMAIL` and `PREVIEW_ADMIN_PASSWORD`. Store those credentials privately.

The login account is created in Turso; the Vercel allowlist grants its CMS access.
Public registration remains disabled. See [Better Auth user and account
storage](https://better-auth.com/docs/concepts/users-accounts).

## Blob storage

Create distinct Preview/contract and Production stores in Vercel. Put only the
nonproduction token in `service-contracts`. Set its exact public origin as
`CONTRACT_BLOB_ORIGIN` and set `PRODUCTION_BLOB_ORIGIN` for an explicit inequality
check. The contract verifies the store identifier encoded in the token **before**
upload and writes only `ci/<run>/<uuid>` objects. Never use a production token to
check whether isolation works.

Connect the nonproduction store to Vercel Preview using
`BLOB_PREVIEW_READ_WRITE_TOKEN` and set its exact public origin as
`BLOB_PREVIEW_PUBLIC_HOSTNAME`. Keep `BLOB_READ_WRITE_TOKEN` and
`BLOB_PUBLIC_HOSTNAME` scoped to Production. Application storage, image loading,
CSP and ownership checks select the Preview pair on Preview deployments, with no
fallback to the production pair. The protected service-contract workflow still
passes its separate `NONPRODUCTION_BLOB_TOKEN` explicitly through its own
`BLOB_READ_WRITE_TOKEN`; it does not use application environment selection.

Application SVG and OG operations still authenticate server-side, validate input,
restrict managed deletion paths, preserve compare-and-swap updates, and clean up
unused/replaced objects. Local production tests use a guarded filesystem adapter;
remote contracts exercise the real SDK and nonproduction store. Blob retention and
query/operation quotas need owner review in the Vercel dashboard.

## Sentry

1. Create a Next.js project in the desired Sentry organization. Choose a data region
   consistent with your privacy requirements and configure retention/usage limits.
2. Copy the public DSN to both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in each Vercel
   environment. Use `NEXT_PUBLIC_APP_ENV`/`APP_ENV` to distinguish Preview/Production.
3. Create a restricted organization/source-map upload token with the scopes Sentry
   currently requires for the selected project. Prefer a nonpersonal token where
   your plan permits. Set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` only for
   Production Vercel builds. Never expose this token to Preview, PR CI or browsers.
4. Deploy a candidate; source-map upload failures must fail its build. Confirm a
   controlled synthetic exception resolves to the original source and no public
   `.map` files remain in static output. Do not enable public production source maps.
5. Inspect a synthetic event and span: no user identity/IP, cookies, headers, bodies,
   query strings, private records, raw exception messages or DB parameters. Explicit
   v11 `dataCollection` settings disable these categories. SDK defaults are not a
   privacy policy. No Replay, profiling, console forwarding or second OTel SDK.
6. Confirm release=Git SHA, environment and deployment tags. Node initialization runs
   once via `instrumentation.ts`; `onRequestError` captures unhandled server failures.
   Client initialization/router capture lives in `instrumentation-client.ts`.
   Error boundaries skip digest-bearing server errors to avoid duplicate reports.
   Returned unexpected provider/storage failures emit one classified event.
7. Start with errors at 100%, production request traces at 10%, Preview tracing 0%.
   Adjust only after reviewing traffic, cost, representativeness and privacy.
8. Add alerts: new production error after release; sustained 5xx/action failures;
   repeated provider/storage failures; latency regression. Send alerts to the owner
   using Sentry's own notification configuration; the implementation does not message
   anyone or configure external integrations automatically.
9. Create metric dashboards for `web_vitals.lcp`, `.inp`, `.cls` p75 grouped by public
   route/release, and `app.operation.duration` by operation/outcome. Field metric
   distributions are emitted independently of 10% trace sampling. Low traffic means
   an incomplete INP population and unstable percentiles; do not claim lab timing is
   real-user data. Browser transport/ad blockers can reduce field coverage.
10. Create the available uptime monitor for `GET /api/ready` with the private Bearer
    token. Use one-minute polling, three consecutive failures to alert and two
    successes to recover, if supported by the selected plan. Keep URL public but
    credential private. Use `/api/health` for separate public liveness checks.

Sentry's current metrics, monitor counts and paid quotas vary by plan; inspect the
project's subscription before activation. Start with the included single uptime
monitor and metric quota where available, keep paid overages disabled unless the
owner enables them. Do not add an overlapping monitoring service by default.
See [Next.js setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/),
[source maps](https://docs.sentry.io/platforms/javascript/guides/nextjs/sourcemaps/),
[data collection](https://docs.sentry.io/platforms/javascript/data-management/data-collected/),
and [uptime monitoring](https://docs.sentry.io/product/uptime-monitoring/).

## Signals, dashboards and limitations

| Signal                                 | Source / collection / display                                                                | Availability and suggested alert                                                                                                       | Limitation                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Liveness and failed probes             | No-store `/api/health`, public SHA; Sentry uptime/readiness monitor                          | Included monitor where available; 3 failed probes, recovery after 2 successes                                                          | A probe is sampled availability, not every user request                                                                             |
| Dependency readiness                   | Bearer-protected `/api/ready`, bounded SQL liveness/schema/ledger batch, 200/503             | Same monitor; investigate repeated 503                                                                                                 | Requires the deployment's committed migration; permits later compatible expand migrations; not a destructive write or full CMS test |
| HTTP 5xx, timeouts, failed requests    | Vercel Observability/Runtime Logs + Sentry request errors/traces                             | Hobby includes limited telemetry/retention; alert >1% with a minimum 20 requests/5min, or 3 consecutive critical errors at low traffic | Sampled tracing cannot supply an exact request denominator                                                                          |
| Server Action and query failures       | Next instrumentation, safe error boundaries, classified caught failures, operation JSON logs | Sentry alerts by operation/release; first regression or repeated critical failure                                                      | Expected validation/auth rejections are not unexpected production exceptions                                                        |
| Request and critical action latency    | Vercel duration telemetry and Sentry sampled HTTP/action spans                               | Alert sustained p95 doubling over baseline with adequate traffic; investigate >2s critical action                                      | Cold starts and sample sizes matter; no invented universal SLO                                                                      |
| Slow project/experience database reads | `observeOperation` spans, duration distributions and JSON logs                               | Sentry p95 operation duration >500ms repeatedly, or >2x baseline                                                                       | Measures app-observed latency; no automatic SQL text/record logging                                                                 |
| LCP, INP, CLS p75                      | Public `useReportWebVitals` → Sentry distributions by route/release                          | LCP >2.5s, INP >200ms, CLS >0.1 after sufficient samples                                                                               | Field data, not Playwright timing; INP requires interactions                                                                        |
| Browser exceptions and hydration       | Sentry browser SDK and error boundaries                                                      | New production issue after release or rising affected-session trend                                                                    | Network blockers and consent configuration can reduce collection                                                                    |
| Failed navigation/client HTTP          | SDK router instrumentation, browser errors and sampled spans                                 | Repeated same-route failures; owner investigates alongside uptime                                                                      | Explicitly handled failures need classified reporting; no recording full responses                                                  |
| CPU, memory, concurrency               | Vercel function invocations, duration/compute/limit metrics in supported Observability views | Investigate OOM, timeout, throttling and rising compute; set plan/usage notifications                                                  | Serverless has no host/pod CPU, RSS or connection-pool dashboard; richer views may require Observability Plus                       |
| Turso service pressure                 | Turso Usage/Stats dashboard/API plus application latency/errors                              | Owner budget/row/storage/request-limit alerts; investigate rising errors/latency                                                       | Metric granularity and retention depend on plan; libSQL HTTP sessions are not persistent SQL server connections                     |
| Release regression                     | Git SHA, Vercel deployment ID, GitHub release evidence, Sentry release/environment tags      | New error/latency spike after promotion or smoke failure                                                                               | An application rollback does not restore data                                                                                       |

Vercel Hobby's short runtime-log retention and free Observability window are useful
for immediate incidents, not durable audit storage (investigation observed roughly
one hour of runtime logs and a 12-hour free Observability window; confirm current
entitlements). Observability Plus requires paid access and adds retention/detail.
Current free Speed Insights may show only an aggregate score, with fuller Web Vitals
views paid; this implementation collects its required p75 metrics in Sentry instead
of installing a duplicate SDK. See [Vercel Observability](https://vercel.com/docs/observability),
[Runtime Logs](https://vercel.com/docs/observability/runtime-logs),
[Speed Insights](https://vercel.com/docs/speed-insights), and [Turso usage](https://docs.turso.tech/usage-and-billing).
