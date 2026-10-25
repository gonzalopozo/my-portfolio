# Turso, Blob and runtime diagnostics

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

## Runtime diagnostics and health

Classified JSON operation logs are available in Vercel Runtime Logs. Each record
contains an allowlisted operation name, outcome classification, duration where
measured, and deployment/release identifiers. Returned unexpected failures include
an opaque support reference. Raw errors, SQL parameters, credentials, sessions and
private records must stay out of these logs.

`observeOperation` measures application-observed duration and sanitizes database
errors before they reach the framework. Error boundaries show a generic recovery
screen and retain the reset action.

`GET /api/health` provides no-store liveness and release identity. The separate
Bearer-protected `GET /api/ready` checks database/schema/migration readiness.
Release candidate and canonical smoke probes use these endpoints; keep the
readiness credential private.

Browser error reporting, request tracing, real-user Web Vitals collection,
continuous external uptime monitoring and application-error alerts are not
configured. The release workflow checks availability during release operations;
it does not continuously monitor the live site.

## Signals, dashboards and limitations

| Signal                           | Source                                                         | Owner review                                                            | Limitation                                                                                                                |
| -------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Liveness and deployment identity | No-store `/api/health` and Git SHA                             | Release smoke evidence; canonical endpoint                              | A point-in-time probe does not establish continuous availability                                                          |
| Dependency readiness             | Bearer-protected `/api/ready`, bounded SQL/schema/ledger batch | Protected release probe results; investigate 503 responses              | Requires the deployment's migration and permits later compatible expand migrations; no destructive write or full CMS test |
| HTTP 5xx and timeouts            | Vercel Runtime Logs and available Observability views          | Compare failures with the deployment and recent changes                 | Available views and retention depend on the plan                                                                          |
| Server Action and query failures | Classified caught-failure logs and safe database errors        | Filter by operation, classification, release and support reference      | Expected validation/auth rejections are distinct from unexpected failures                                                 |
| Database operation latency       | `observeOperation` JSON logs with `durationMs`                 | Compare representative operation durations with the previous release    | No distributed traces or automatic percentile dashboard                                                                   |
| Compute and service pressure     | Vercel function/usage views, Blob usage and Turso Usage/Stats  | Review timeouts, resource limits and available quota notifications      | Signal detail and notification support depend on each provider's plan                                                     |
| Release regression               | Git SHA, Vercel deployment ID and GitHub release evidence      | Correlate smoke failures, runtime logs and service usage with promotion | An application rollback does not restore data                                                                             |

Confirm the current Vercel and Turso plan limits and retention in their dashboards.
Runtime logs may expire before a later investigation; retain a private, sanitized
incident timeline and release evidence. Synthetic browser timings are lab evidence,
not real-user percentiles. See [Vercel Observability](https://vercel.com/docs/observability),
[Runtime Logs](https://vercel.com/docs/observability/runtime-logs), and
[Turso usage](https://docs.turso.tech/usage-and-billing).
