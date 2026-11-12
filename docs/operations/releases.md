# Release and incident runbook

Complete [CircleCI setup](./circleci.md), [GitHub protections](./github.md),
[Vercel setup](./vercel.md) and [service isolation](./services.md) before activation.
Repository implementation alone does not prove account settings, verification or
recovery. Keep `CIRCLECI_RELEASES_ENABLED=false` in `ci-metadata` until the owner
reviews those prerequisites and deliberately enables the controlled release drill.

## Validation and approval prerequisites

A release requires the exact current 40-character main SHA and successful
`main-validation` from an actual push. Every required job must succeed and the
proof must be less than 24 hours old. PR success and API-triggered manual validation
cannot replace this merged-push proof. A newer failed/pending manual or scheduled
validation also blocks the affected gates. Rerun the original push workflow for
unchanged main if freshness has expired; old scheduled failures may be superseded
by a newer successful full validation.

CircleCI holds are the human gates. Releases use `approve-release-migrations` and
`approve-release-production`; baseline and rollback use `approve-baseline-migrations`
and `approve-rollback-production`, respectively. Each hold has a distinct name so
dependencies remain within its job group.
The controller binds them to the current workflow/project/pipeline/main checkout,
requires the configured owner UUID and rejects missing, cancelled, wrong-role or
expired approvals. A pipeline start, green smoke check or GitHub Deployment record
is not approval. Its read-scoped CircleCI token cannot approve jobs.

## Normal release

1. Merge the reviewed feature PR after all seven required checks. Wait for the
   actual merged SHA's main-validation. Review SQL changes and old/new compatibility.
2. Confirm Turso recovery availability and record a nonsecret recovery reference.
   Record the previous live Vercel deployment ID and SHA privately.
3. Open **CircleCI → Portfolio → Run Pipeline**, select main for config/checkout,
   and enter `task=release`, `sha=<full-current-main-sha>` and
   `recovery_point=<confirmed-reference>`. Parameters never contain credentials.
4. Preflight verifies immutable source, current main, fresh results, open blocking
   findings, approval hold presence, Vercel project/repository/branch, disabled
   domain assignment and the previous production target.
5. Service contracts create an owned disposable nonproduction Turso database,
   exercise real SQL/Blob transport and clean up. Failure blocks migration/build.
6. Open the `approve-release-migrations` hold inside the release group. Review the SQL diff,
   expand/contract policy, ledger/drift and recovery point. Approve deliberately.
   Migration rechecks approval, checkout/current SHA and fresh validation before
   applying reviewed expand SQL under the database write lock. No schema push or
   automatic contract migration is allowed.
7. Candidate creation uses the exact SHA and production Vercel environment with
   domain assignment disabled. The old application stays live against compatible
   expanded SQL. The candidate's Ready state, source/project/origin, age, health,
   public/login/auth behavior and authenticated readiness must pass verification.
8. **Before approving production**, review candidate evidence, the protected
   deployment URL, candidate ID/SHA and relevant runtime logs. Record the canonical
   health SHA while waiting and confirm it is still the previous live release.
9. Approve `approve-release-production`. The controller rechecks owner approval, main,
   fresh validation/findings, candidate age/source, previous live identity and smoke
   behavior. Changed main/production, expired evidence or a failed probe blocks it.
10. Promotion uses the same candidate ID without rebuilding. The controller restores
    disabled automatic domain assignment, waits for the production target and the
    canonical uncached health SHA, then runs canonical public/auth smoke checks.
    Only successful completion writes a successful production Deployment status.
11. Watch availability, classified errors, action durations and provider usage.
    Record the deployment chain and review results privately before acceptance.

All three production operation groups share `portfolio-production`; the lock spans
human waits and all downstream jobs. Do not release it manually, cancel an active
migration or introduce another dashboard/CLI migration writer. Skipped/expired
queued operations require a new reviewed dispatch; they are not completed releases.

## Failure handling

- PR validation or scanning failure blocks merging. Fix it or record a narrowly
  proven false positive; do not weaken a gate or silently suppress warnings.
- Main validation, missing approval or failed contracts blocks release work.
- Missing/changed ledger, unknown schema drift and incompatible SQL block migration.
  Prepare recovery and a reviewed baseline/reconciliation instead.
- Candidate build/smoke failure leaves the old app live; keep compatible additive
  SQL in place. Do not reverse migrations because an application candidate failed.
- Rejected approval, changed main or expired candidate prevents promotion.
- Canonical smoke failure fails the release and records failure. Inspect actual
  live state and obtain owner-approved rollback where necessary.
- Promotion happens before canonical smoke. A failed smoke job can therefore
  leave the candidate live while its GitHub Deployment status is failure. Compare
  the actual production deployment ID and canonical health SHA with the run's
  candidate evidence before retrying. Repeating promotion against the former
  previous deployment can fail its production-identity guard.
- Failure to restore disabled automatic domain assignment is an incident: freeze
  Git production triggers, restore the setting and verify actual domains.
- Runner interruption requires checking ledger, deployment identity, current
  domains and owned resources before retrying; failure does not imply no side effects.

Health probes request fresh responses throughout polling and final smoke. Health
errors distinguish an unhealthy status, a different release SHA and a missing
`Cache-Control: no-store` header. Only valid commit SHAs appear in mismatch
diagnostics; arbitrary response values and bodies remain omitted. A later healthy
response does not change the failed run into a successful release.

Candidate/production GitHub Deployment records retain the Vercel ID, previous ID,
SHA, CircleCI IDs, approval identity and status. CircleCI artifacts contain bounded
identity/state JSON; export needed records privately for at least 90 days because
CircleCI artifacts expire. Never archive credentials, response bodies, browser
storage state, database files, TLS keys or environment files. See
[retention settings](./circleci.md#production-activation-and-evidence).

## Baseline an existing production database

Use `task=baseline`, the full current main `sha`, `recovery_point`, and exact
`baseline_tag`. Preflight requires fresh validation and the migration hold.
After SQL/schema comparison and recovery review, approve `approve-baseline-migrations`.
The controller checks the exact reference schema and inserts only the matching
historical ledger prefix. Existing ledgers and unknown drift are rejected.
A baseline is an exceptional owner operation, not a normal release step.

## Rollback

1. Identify the current live deployment and its recorded previous successful
   deployment ID/SHA. Confirm that old application code remains compatible with
   the current expanded schema and any backfill/contract changes.
2. On Vercel Hobby, use the previous production deployment; do not assume arbitrary
   historical promotion/redeployment is supported.
3. In CircleCI Run Pipeline, select main for controller config/checkout and enter
   `task=rollback`, `deployment_id=<previous-id>` and `sha=<previous-full-sha>`.
   The target SHA intentionally differs from the controller/current main SHA.
4. Review the target and approve `approve-rollback-production`. The controller verifies
   the successful GitHub deployment chain and target source, performs read-only
   smoke probes, invokes Vercel rollback, restores domain safeguards and waits
   for canonical health/public/auth checks before recording success.
5. Record symptom, timing, deployment IDs, current SQL state and follow-up. App
   rollback does not reverse SQL or restore production data. Turso data recovery
   is a distinct, potentially lossy operation requiring an incident-specific plan.

**Bootstrap limitation:** the deployment live before release automation may have
no health endpoint or successful deployment record. Do not invent that proof.
Retain the private owner-approved **Vercel → Deployments → previous production
→ Instant Rollback** emergency path, restore disabled automatic domain assignment
and verify its historical behavior manually. CircleCI outages use that same
owner-operated recovery path; reconcile deployment evidence afterward.

The controller retains `POST /v10/projects/{projectId}/promote/{deploymentId}` and
`POST /v1/projects/{projectId}/rollback/{deploymentId}`. Historical successful
GitHub deployment payloads remain compatible with the new rollback controller.

## Operational acceptance

Complete the migration checklist with actual evidence for local browser hooks,
CircleCI gates/source restrictions, native security, service cleanup, schema
compatibility, hosted Preview acceptance, staged approvals, canonical verification,
release retention and an applicable recovery drill. Keep unproven settings and
old outstanding obligations open. No checkmark is created by implementation alone.
