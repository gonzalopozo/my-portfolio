# Vercel Hobby setup — owner actions

Use the existing Vercel project and official Git integration. These settings are
not enabled by repository files. Do not turn on production releases until the
GitHub environment reviewer gate and the database recovery procedure are working.

## 1. Freeze automatic production exposure

1. In **Project → Settings → Environments → Production**, find automatic production
   domain assignment and disable it. Record the current live deployment ID and SHA.
   If the UI does not expose the toggle, the supported project API field is
   `autoAssignCustomDomains: false` on `PATCH /v9/projects/{idOrName}`. This is an
   owner setup operation; do not put a token in shell history or committed config.
2. Confirm no scheduled job, deploy hook or integration independently promotes main.
3. Keep native GitHub Deployment Checks disabled for this staged architecture.
   They require automatic domain assignment and can promote when checks succeed;
   they do not create a separate human approval gate.
4. `vercel.json` disables automatic Git deployments for `main` and the transitional
   `restructure` branch. Feature-branch Preview builds remain enabled. Production
   candidates are created only by the approved Release workflow via Vercel's API.
5. Change **Settings → Git → Production Branch** to `main` only after the baseline
   PR has preserved existing history and main contains the new workflows.

This is one managed deployment service: Vercel builds the candidate. Actions
orchestrates checks and approval; it does not upload/rebuild artifacts for promotion.
The controller passes the immutable Git SHA and checks the returned deployment.
See [staged deployments](https://vercel.com/docs/deployments/managing-deployments#staged-deployments),
[create deployment API](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment),
and [Vercel OpenAPI](https://openapi.vercel.sh/).

## 2. Build settings

In **Settings → Build and Deployment**:

- Framework: Next.js. Root directory: repository root. Node.js version: **24.x**.
- Use the committed install/build commands from `vercel.json`; remove conflicting
  dashboard overrides. They bootstrap verified pnpm 12.14.0 natively on Linux x64.
- Do not set `CI` test fixtures, `APP_ENV=test`, or `TEST_FIXTURE_DIRECTORY` on Vercel.
- Set `VERCEL_FORCE_NO_BUILD_CACHE=1` independently for Preview and Production.
  Rebuild without cache once to confirm the setting is effective in deployment logs.
- Do not enable `.next` cache persistence. The framework configuration disables
  Turbopack filesystem caching for production builds and retains development caching.

Vercel maintains platform-internal images/tool downloads and may have layers you
cannot disable. The repository does not claim control over all internal caches.
Application Cache Components, ISR/data caches and CDN behavior are independent and
must remain enabled where the application uses them. See [build cache](https://vercel.com/docs/deployments/troubleshoot-a-build#understanding-build-cache).

## 3. Environment variables

Use **Settings → Environment Variables** with explicit environment scopes. Check
values privately in the dashboard; never paste them into tickets, traces or docs.

| Name                                                            | Preview                                                                  | Production                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `APP_ENV`                                                       | `preview`                                                                | `production`                                                                               |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`                        | Dedicated synthetic Preview DB/token                                     | Production DB/token                                                                        |
| `BETTER_AUTH_SECRET`                                            | Independent Preview secret                                               | Production secret                                                                          |
| `BETTER_AUTH_URL`                                               | Appropriate exact Preview base origin; configure per branch if necessary | Canonical production origin                                                                |
| `BETTER_AUTH_TRUSTED_ORIGINS`                                   | Explicit HTTPS origins only                                              | Canonical origins; exact platform deployment origin is also validated from Vercel metadata |
| `ADMIN_USER_IDS`                                                | Synthetic Preview admin IDs                                              | Existing trusted administrator IDs                                                         |
| `BLOB_PREVIEW_PUBLIC_HOSTNAME`, `BLOB_PREVIEW_READ_WRITE_TOKEN` | Dedicated nonproduction store, Preview scope only                        | Absent                                                                                     |
| `BLOB_PUBLIC_HOSTNAME`, `BLOB_READ_WRITE_TOKEN`                 | Absent                                                                   | Production store, Production scope only                                                    |
| `LASTFM_USERNAME`, `LASTFM_API_KEY`                             | Test account or leave unset to exercise safe fallback                    | Production provider configuration                                                          |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`                    | Only if the current integration actually uses them                       | Existing provider configuration; hosted browser scraping falls back safely                 |
| `CSP_PUBLIC_MODE`, `CSP_ADMIN_MODE`                             | `enforce` for acceptance candidate                                       | Enforce after acceptance                                                                   |
| `CSP_ADMIN_POLICY`                                              | `nonce` for acceptance candidate                                         | `nonce` after acceptance                                                                   |
| `HEALTH_READINESS_TOKEN`                                        | Independent Preview credential                                           | Strong random production credential, shared only with protected GitHub jobs                |
| `VERCEL_FORCE_NO_BUILD_CACHE`                                   | `1`                                                                      | `1`                                                                                        |

Blob selection uses `VERCEL_ENV` when present, otherwise `APP_ENV`. Preview reads
only `BLOB_PREVIEW_PUBLIC_HOSTNAME` and `BLOB_PREVIEW_READ_WRITE_TOKEN`; there is no
fallback to the unprefixed production credential. The same store selection applies
to uploads, deletions, image optimization, CSP and file ownership checks. The token
is passed explicitly to the Blob SDK. Production and local development/test use the
unprefixed pair.

`.env.example` documents variable names with placeholders and empty tokens; it
contains no real credentials. Put real local values in a private `.env.local` or
`.env.preview.local`. Next.js automatically loads `.env.local` for local runs; the
custom `.env.preview.local` file must be loaded explicitly. To run the app locally
with the Preview pair, set `APP_ENV=preview` and both
`BLOB_PREVIEW_*` values in the active local file, leaving `VERCEL_ENV` unset. Keep
all database/auth settings consistent with the same isolated Preview resources.
Migration and account-provisioning commands do not require Blob credentials. See
[Next.js environment loading](https://nextjs.org/docs/app/guides/environment-variables#environment-variable-load-order).

`NEXT_PUBLIC_RELEASE_SHA` is injected from the Vercel Git commit SHA at build time;
leave it to committed configuration. Vercel supplies deployment/runtime identifiers.

Do not point Preview at production credentials even temporarily. A nonproduction
label does not make a production token safe. Avoid automatic integrations that
copy production database or Blob credentials into all environments.

## 4. Preview protection and untrusted code

1. Enable **Deployment Protection → Vercel Authentication / Standard Protection**
   for Preview and generated deployment URLs, as available on Hobby.
2. Require owner approval for deployments from forks/untrusted contributions. Do not
   approve code before review to run with Preview credentials. Secret-free Actions
   tests remain mandatory for every PR and do not depend on a Preview deployment.
3. Create an automation bypass secret under **Deployment Protection → Protection
   Bypass for Automation**; store it only in protected GitHub environments. Verify
   its current scope in the Vercel dashboard. Do not add it to `NEXT_PUBLIC_*` values.
4. **Scope limitation:** Vercel automation bypass secrets apply across a project,
   and Vercel can expose a selected secret as `VERCEL_AUTOMATION_BYPASS_SECRET` to
   deployments. They are not inherently Preview-only secrets. Inspect/disable that
   environment exposure for untrusted builds if supported by your configuration;
   never describe the bypass as isolated production data access. If you cannot
   prevent exposure, do not run untrusted source in that credentialed project.
   Keep fork previews unapproved and use secret-free local production E2E instead.
   A separate nonproduction Vercel project would be required if automatic untrusted
   fork previews with project-level credential isolation become a requirement.
5. Disable the Preview toolbar for the CSP acceptance candidate unless its exact
   additional origins are separately reviewed. Do not broaden CSP for convenience.

The controller verifies deployment project, state, source and exact HTTPS origin
before sending bypass headers. Redirects cannot forward credentials to other origins.
Browser acceptance bootstraps an origin-bound bypass cookie, with redirects disabled;
it never installs a bypass header globally on third-party browser requests.
See [automation bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

## 5. Production release and rollback

Follow [releases](./releases.md). Candidate creation must leave the canonical domain
on the old deployment. Review the protected candidate and GitHub evidence, then
approve **Release / Promote**. Promotion uses the same deployment ID and never
rebuilds the release. The controller resets automatic domain assignment to false
because promotion can re-enable it, then verifies canonical identity and behavior.

On Hobby, Instant Rollback is restricted to the previous production deployment.
Keep that deployment available and record database compatibility before release.
The controller restricts rollback to the recorded previous known-good ID and SHA.
The first release's historical deployment may lack a GitHub record; its emergency
rollback is a deliberate owner dashboard operation, documented in the release runbook.
See [rollback](https://vercel.com/docs/instant-rollback).

## 6. Owner acceptance checks

- Preview and production resource identifiers differ; no real records in fixtures.
- Failed or skipped CI blocks merging; a failed post-merge run blocks candidate creation.
- Production candidate becomes Ready while the old live domain remains unchanged.
- No reviewer configured causes preflight failure; approval pending leaves live unchanged.
- Rejecting approval prevents promotion; changing main during the wait makes release stale.
- Health identity equals the candidate SHA before and canonical SHA after promotion.
- Failed smoke checks produce a failed workflow, not a successful release record.
- A rollback drill restores the previous deployment without reversing SQL migrations.
- Classified operation logs, deployment identity and protected readiness probes work.

Do not report these as complete until you have recorded actual platform evidence.
