# Release and incident runbook

## Release prerequisites

A workflow file does not enable protection. Finish the GitHub, Vercel and service
setup guides, verify environment reviewer gates, and reconcile the actual production
migration ledger before the first release. Never put credentials in workflow inputs.

Required merged-commit workflows are `ci.yml`, `security.yml` and `codeql.yml`.
Their latest successful **push to main** runs must match the exact current main SHA
and be less than 24 hours old. Scheduled scans supplement this proof but do not
replace a merged-commit validation. A newer failed/pending scheduled or manual run
also blocks release; an older successful push cannot override it. Re-run stale main
runs in GitHub before release.
A failed, skipped, cancelled or missing required gate is not success.

## Normal release

1. Merge a reviewed feature PR after all required checks succeed. Wait for the
   actual main commit's CI/security runs. Review SQL changes and old/new compatibility.
2. Confirm Turso recovery is available and record a nonsecret recovery point or
   backup reference. Identify the previous live Vercel deployment and keep it.
3. In **GitHub → Actions → Release → Run workflow**, choose branch `main`, operation
   `release`, the full 40-character current main SHA, and the recovery reference.
   Do not use a branch name or abbreviated SHA as the release identity.
4. Preflight verifies current main, fresh validation, blocking security findings,
   Vercel project/branch, disabled domain assignment and reviewer configuration.
5. Protected nonproduction service contracts create an owned disposable Turso DB,
   exercise transport/constraints and Blob operations, and clean up their resources.
6. Review **Release / Migrations** under **Review deployments**. Check the SQL diff,
   migration policy, ledger and recovery reference. Approve only compatible expand
   migrations. The tool rechecks checkout/current SHA and recorded human approval.
   It never pushes schema or automatically executes contract SQL.
7. Vercel creates a **production-environment candidate** from the exact SHA with
   automatic assignment disabled. The old app remains live against the expanded,
   backward-compatible schema. A failed candidate leaves that app live; do not undo
   additive SQL merely because the candidate failed.
8. Candidate checks verify project/state/source, health SHA, public content, login,
   auth endpoint and database readiness. Review the protected deployment URL,
   deployment identity and runtime logs. Smoke probes perform no CMS mutations.
9. Review **Release / Promote**. Approve the protected `production` environment only
   after reviewing the candidate and evidence. Rejecting approval leaves the old
   deployment live. Starting the workflow is not production approval.
10. After approval, the controller rechecks main, fresh runs, open code findings,
    reviewer configuration/history, candidate age, prior live identity and smoke
    behavior. A changed main/production state or expired candidate blocks promotion.
11. Promotion uses **the same deployment ID** with no rebuild. The controller restores
    disabled domain assignment, waits for live identity, verifies the canonical
    origin and writes a successful GitHub deployment record only after smoke passes.
12. Inspect Vercel Runtime Logs, action failures, operation durations and service
    usage for regressions. Use representative requests when traffic is low.
    Record the release and previous known-good IDs for incident recovery.

Production credential scopes are separated: migration gets only Turso credentials;
candidate/promotion get Vercel and readiness credentials; ordinary PR jobs get none.
All production operations share a concurrency group that does not cancel running jobs. Do not cancel an
active migration or start a competing dashboard/CLI migration writer.

## Failure handling

| Failure point                      | Effect and response                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| PR validation or scan              | Merge blocked. Fix or review a narrowly proven false positive; do not weaken the gate                                       |
| Post-merge validation              | Candidate creation blocked, even if the PR was previously green                                                             |
| Service contract                   | Production migration/build blocked. Diagnose remote fidelity/credentials/quota and cleanup owned fixtures                   |
| Missing ledger or drift            | Migration blocked. Prepare recovery and perform approved exact baseline/reconciliation                                      |
| Migration fails                    | Transaction rolls back; inspect provider state/ledger, verify old application before retry                                  |
| Candidate build/smoke fails        | No promotion. Expanded schema remains; fix code in a new PR                                                                 |
| Approval rejected/stale main       | No promotion. Dispatch a fresh release after appropriate checks                                                             |
| Promotion or canonical smoke fails | Workflow fails and deployment record is failed. Inspect actual live target; initiate owner-approved rollback if needed      |
| Automatic assignment reset fails   | Treat as an incident: freeze Git production triggers, restore the setting manually, verify current domains                  |
| Runner interruption                | Inspect migration ledger, deployment state and owned resources before retrying; do not infer failure means nothing happened |

Release artifacts contain deployment IDs, SHA, run ID, timestamps and state only.
Local browser artifacts contain synthetic accounts/data and expire after three days.
Remote Preview authentication never records traces/screenshots. Do not attach
production response bodies, storage state, database files or `.env` files to incidents.

## Rollback

1. Identify the current live ID and the **recorded previous successful** production
   ID/SHA. Confirm that previous code works with the current expanded schema and
   that no contract/backfill makes it unsafe.
2. On Hobby, the supported Instant Rollback target is the previous production
   deployment. Do not assume arbitrary historical redeployment/promotion is available.
3. Dispatch **Release**, branch `main`, operation `rollback`, the previous deployment
   ID and its full commit SHA. The SHA intentionally differs from current main.
4. Approve the `production` environment. The controller checks recorded successful
   evidence and the current deployment's parent, tests the target with readonly
   probes, invokes Vercel rollback, waits for the target and verifies canonical SHA.
5. Verify public content, health, authentication availability and monitoring. Perform
   protected account checks privately if necessary; do not mutate real CMS content.
6. Document symptom, timeline, release IDs, SQL state, recovery action and follow-up.
   Create a focused fix PR; never rebuild the old release using unknown dependencies.

**Bootstrap limitation:** the deployment live before this implementation may have
no health endpoint or successful GitHub deployment record. The first release cannot
invent that evidence. Record it privately, test its existing behavior before release,
and use **Vercel → Deployments → previous production deployment → Instant Rollback**
with explicit owner approval for first-release recovery. Restore automatic domain
assignment to false and verify its historical behavior manually. After the new system
has recorded successful releases, the controller can enforce its known-good chain.

The API currently uses `POST /v10/projects/{projectId}/promote/{deploymentId}` and
`POST /v1/projects/{projectId}/rollback/{deploymentId}`. The owner can use dashboard
operations for an emergency when GitHub/API automation is unavailable; audit that
operation, preserve the same compatibility checks, and reconcile GitHub evidence.
Do not describe app rollback as migration rollback. Turso data recovery is a distinct,
potentially lossy operation into a new database and needs an incident-specific plan.

## Operational definition of done

- [ ] Authorized local verification or actual CI has completed every required gate;
      warnings are resolved or documented confirmed false positives, not silently ignored.
- [ ] All original test files are retained except the external Playwright example;
      application tests and risk coverage gates pass without hidden skips/flakes.
- [ ] Production E2E builds once, starts `next start` with local HTTPS, and tests the
      real authentication, authorization, CMS mutations, uploads, cache and streaming.
- [ ] Migration drift/prefix replay and real remote contracts pass; production ledger
      matches reviewed files and the recovery procedure has been exercised.
- [ ] GitHub main ruleset, stable required checks, review policy and bypass restrictions
      are configured and tested. Default branch transition preserved history.
- [ ] Dependabot compatibility is proven or its unsupported updater limitation is
      tracked with reviewed manual updates; alerts, CodeQL and secret protection work.
- [ ] Preview/Turso/Blob/auth resources are isolated; fork code gets no production
      credentials. Project-wide Vercel bypass exposure is addressed explicitly.
- [ ] Vercel main Git deployment is disabled, runtime is Node 24, pnpm is exact, and
      build-cache bypass is confirmed. Legitimate runtime/CDN caching is intact.
- [ ] Candidate stays off the canonical domain until genuine protected approval;
      missing approval configuration, stale SHA and failed smoke tests block release.
- [ ] Classified operation logs, release identity and health/readiness probes are
      proven with synthetic requests, without private records in logs or artifacts.
- [ ] Production promotion and a rollback drill have evidence; SQL compatibility and
      first-release recovery limitations are documented.
- [ ] Agent documentation agrees with the architecture; root pre-commit/subagent
      requirements remain intact.
- [ ] Owner-managed settings are recorded as configured only after actual confirmation.

GitHub concurrency never automatically cancels an active release. GitHub can replace
an older _pending_ run when another dispatch joins the same concurrency group;
review queued releases before dispatching again. Main CI/security runs use unique
non-PR groups so newer pushes cannot cancel their required validation.
