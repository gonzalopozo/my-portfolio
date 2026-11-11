# CircleCI migration to-do list

Migration started on 2026-11-06 because GitHub Actions capacity was exhausted,
primarily by production Playwright runs. The previous rollout is paused; its
original numbers, checkmarks, private-settings notes and evidence are preserved
in [GitHub Actions rollout history](./ci-cd-github-actions-history.md). Those
checkmarks do not establish that CircleCI is configured or that this migration
has passed validation.

Use the [CircleCI setup guide](./circleci.md), [local testing guide](./testing.md),
[GitHub protections](./github.md), and [release runbook](./releases.md). Work in
the phase order below. CCI numbers are stable task IDs; they are not a strict
numerical execution order. Record completion dates and exact SHA/run/deployment
evidence. Existing checkmarks retain owner-recorded progress; implementation
alone does not complete platform setup or testing.
Never include credentials, browser state, databases or private response bodies.

**If your migration branch is already committed and pushed, continue with
[Publish the branch and validate its PR](#publish-the-branch-and-validate-its-pr).
Open the PR before attempting CCI-006.** Pushing a feature branch and validating
a PR are separate steps.

## Account, safety and developer setup

- [x] **CCI-001.** Freeze both old and new production dispatches. Record the live
      deployment ID, SHA, canonical origin and recovery option. Preserve Vercel's
      disabled main Git deployments and disabled automatic domain assignment.

    **Where:** Vercel → project → Deployments / Domains / Production settings;
    GitHub → Actions; private operations notes. Carries forward historical 003.

- [x] **CCI-002.** Create the CircleCI email account, enable MFA, create an
      organization, select Free and install its GitHub App for this repository
      only. Confirm no paid credits or automatic refill is enabled.

    **Where:** [CircleCI signup](https://circleci.com/signup/) → organization;
    Plan / Usage; GitHub → Settings → Applications → Installed GitHub Apps.

- [x] **CCI-004.** Install Node 24, pinned pnpm, OpenSSL, all Playwright browsers
      and required system libraries locally. Run the explicit Husky installation
      in every clone/worktree used for commits or pushes.

    **Where:** Local terminal → [developer setup](./testing.md#developer-setup).
    Implementation approval does not authorize agents to run verification.

- [x] **CCI-005.** On a disposable local branch, demonstrate both hooks run the
      complete production suite and a browser failure blocks both commit and push.
      Confirm API, all three desktop engines, mobile and CSP projects run, cleanup
      succeeds and an active development build remains intact.

    **Where:** Local terminal → authorized commit/push verification. Record test
    output and the tested working-tree state privately; never push a failing branch.

## Publish the branch and validate its PR

Before CCI-006, complete this publishing sequence. If an action is already
complete, continue with the next one rather than repeating it.

1. Complete authorized local verification, commit the migration on its feature
   branch, and push that branch. Keep main protected; merge through a PR.
2. Finish or confirm the Portfolio project setup in CCI-003 using the pushed
   branch for initial bootstrap and the enabled PR/default-branch trigger.
3. On GitHub, open the migration PR with **base main** and **compare your
   pushed migration branch**. A draft PR is supported by the selected trigger.
4. Continue with CCI-006 once that PR has triggered `pr-validation`. A push
   to a feature branch without an open PR is not this PR-validation run.

Prepare the restricted contexts in CCI-008 before merge so the first actual
main validation can publish CodeQL. Keep deployment credentials out of PR
jobs and keep `CIRCLECI_RELEASES_ENABLED=false`.

- [x] **CCI-003.** Create the Portfolio and isolated Portfolio Preview projects.
      Enable the Portfolio GitHub trigger for same-repository PRs/default-branch
      pushes, using `.circleci/config.yml` from the event revision. Target main
      as the PR base. For Preview, prepare `.circleci/preview.yml` with main
      config/checkout refs and keep its GitHub trigger disabled. Connect and
      prove the Preview webhook only after merge, in CCI-011.
      Record project IDs, pipeline definition IDs and the main project slug.

    **Where:** CircleCI → Projects → Create Project → Project Setup. See the
    [project setup instructions](./circleci.md#projects-and-triggers).

- [x] **CCI-006.** After opening the migration PR against main, wait for its
      `pr-validation` workflow and prove all seven CircleCI jobs:
      quality, tests/coverage, migrations, browser-free production build/smoke,
      dependencies, secrets and CodeQL. Confirm frozen pnpm installation, no
      caches, no Playwright invocation and no browser downloads.

    **Where:** GitHub → Pull requests → migration PR → Checks; CircleCI →
    Portfolio → `pr-validation` → job results. This item verifies the PR
    created in the steps above; it does not require an earlier PR or merge.

- [x] **CCI-008.** Before merging, configure every context and its project, main,
      SSH and config-source restrictions. Obtain the read-scoped CircleCI API
      token and owner UUID.
      Issue narrowly scoped GitHub credentials and migrate provider secrets from
      private storage. Prepare the isolated Preview project variables too,
      keeping its webhook off until CCI-011. Ordinary PR validation receives
      none of these privileged contexts. Keep release activation false until
      the controlled drill.

    **Where:** CircleCI → Organization Settings → Contexts and User Settings;
    provider token dashboards; [credential matrix](./circleci.md#credentials).

- [ ] **CCI-009.** Review the migration PR controller test results for rejection
      of wrong projects, checkouts, workflows, SHAs, approval roles/actors and
      missing/expired approvals. Confirm coverage of fresh main-push proof,
      newer failed/pending scans and stale-result rejection. Actual hosted
      approval/release drills follow merge in CCI-012 and CCI-016; passing unit
      tests does not prove external account settings.

    **Where:** CircleCI → migration PR → tests → controller test results.
    Review the `tests` job in that PR's `pr-validation` workflow; the separate
    `migrations` job checks schema replay/drift. Keep all seven PR checks passing
    before proceeding to the required-check cutover and merge.
    Carries forward the test coverage for 053 and applicable 251–255 drills;
    retain actual hosted rehearsal evidence under CCI-012 / CCI-016.

## Switch required checks and merge the PR

Continue only after the migration PR has successful CircleCI checks.
Configure the new required checks while the PR is open, then merge it.
Main-only publication, service contracts and Preview checks follow merge;
they are not prerequisites for creating this first migration PR.

- [ ] **CCI-013.** After the seven checks genuinely appear on the migration PR,
      replace old Actions required checks with their exact CircleCI names and
      source. Preserve PR-only main updates, up-to-date branches, conversation
      resolution, force-push/deletion restrictions and CodeQL severity enforcement
      through the required CircleCI check. Retire native required-tool rules that
      still wait for PR/Actions analyses; main SARIF/alerts remain active.
      Disable duplicate default CodeQL setup so main can accept external SARIF.
      Keep release activation false. A final Actions rerun is not required
      for this cutover.

    **Where:** GitHub → Settings → Rules → Production main → required checks.
    Record the actual emitted names and a failing-check rejection example.

- [ ] **CCI-014.** Merge the reviewed migration with all six repository Actions
      workflows removed. Retain only Dependabot's package updater and native
      security features. Confirm no old default CodeQL or custom workflow remains
      active. Retain historical run/evidence links and shared Git history.

    **Where:** GitHub → migration PR / Actions / Code security / Dependabot.
    Standard Dependabot update jobs may remain visible in Actions; they do not
    consume the included Actions minutes.

## Validate merged main and hosted workflows

These tasks require the migration files on main. First obtain successful
validation for the actual merged SHA; keep production release activation
disabled while accepting security publication, nonproduction contracts,
Preview checks and isolated controller rehearsals.

- [ ] **CCI-015.** Retain successful main-validation evidence for the exact merged
      SHA. Enable daily security and weekly CodeQL schedule triggers; prove their
      first runs. Review actual credits, resource memory and projected monthly
      usage against the free allowance before considering setup complete.

    **Where:** CircleCI → Portfolio → pipelines / Project Setup → Schedules;
    organization → Plan / Usage. Never enable paid overage to make a check pass.

- [ ] **CCI-007.** After merge, prove trusted-main SARIF publication and verify
      that the duplicate GitHub default CodeQL setup was disabled at CCI-013.
      Retain the PR severity-blocking evidence from CCI-006, the dependency graph,
      Dependabot alerts/updates, native secret scanning and push protection.
      Resolve historical exposed credentials and review bypass permissions.

    **Where:** CircleCI security jobs; GitHub → Settings → Code security and
    Security → Code scanning / Secret scanning. Carries forward 038–041 and 160.

- [ ] **CCI-010.** After the migration config/scripts reach main, run service
      contracts from trusted main using only nonproduction resources. Prove
      ownership fingerprint checks, success/failure cleanup and
      interrupted-run reconciliation. Confirm production schema/ledger and
      compatibility guards remain enforced.

    **Where:** CircleCI → Run Pipeline → task `contracts`; isolated Turso/Blob
    dashboards; [services guide](./services.md). Carries forward 256–257 and 261.

- [ ] **CCI-011.** After `.circleci/preview.yml` and its controller reach main,
      connect the GitHub deployment-status webhook to the isolated Preview
      project. Prove successful Preview events automatically run HTTP
      smoke checks; ping/failure/production events are ignored, other repositories
      and fork-only/superseded sources are rejected, and credentials stay private.
      Run authenticated Preview browser acceptance locally when applicable.

    **Where:** GitHub → Settings → Webhooks → Recent Deliveries; CircleCI →
    Portfolio Preview; local `pnpm test:preview`. See [Preview setup](./circleci.md#automatic-preview-smoke).

- [ ] **CCI-012.** After merge, retain the merge-blocking evidence from CCI-013
      and prove missing/failed/cancelled/skipped gates block release. Rehearse
      failed contracts, drift, build/smoke failures, changed main,
      rejected approval, canonical smoke failure and interrupted cleanup safely.

    **Where:** Disposable PR/local branch and isolated CircleCI/provider resources.
    Carries forward applicable historical 251–261; do not mutate production for drills.

## Production activation and ongoing ownership

- [ ] **CCI-016.** Deliberately enable releases for a controlled release and rollback
      drill. Review SQL/recovery before migration approval and candidate evidence
      before production approval. Record the old canonical health SHA while the
      candidate waits, then prove same-ID promotion and canonical smoke success.
      Verify previous-release rollback compatibility and unchanged SQL.

    **Where:** CircleCI → Run Pipeline → task `release` / `rollback` → approval
    jobs; Vercel; GitHub Deployments; private recovery notes. Carries forward
    215, 222, 228–229 and applicable 262–270. Missing evidence remains open.

- [ ] **CCI-017.** Export nonsensitive release evidence privately for at least 90
      days; configure short CircleCI diagnostic retention. Review health/readiness,
      classified logs, provider quota notifications, credential rotation and weekly
      dependency/image/binary updates. Reconcile guides, limitations and owners.
      Remove obsolete Actions secrets only after the cutover/recovery evidence.

    **Where:** CircleCI → Plan → Usage Controls; GitHub Deployments; private
    operations archive; Vercel/Turso/Blob dashboards. Carries forward 231, 242,
    246–247, 271–272 and 274–277. Read-scoped CircleCI tokens expire after 90 days.

The historical performance measurement work in 250, retirement of `restructure`
in 273, and other unfinished work not explicitly carried forward above remain
paused backlog. A migration does not prove their acceptance criteria or authorize
removing Vercel's main production safeguard.
