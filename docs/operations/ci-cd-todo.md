# CircleCI migration to-do list

Migration started on 2026-11-06 because GitHub Actions capacity was exhausted,
primarily by production Playwright runs. The previous rollout is paused; its
original numbers, checkmarks, private-settings notes and evidence are preserved
in [GitHub Actions rollout history](./ci-cd-github-actions-history.md). Those
checkmarks do not establish that CircleCI is configured or that this migration
has passed validation.

Use the [CircleCI setup guide](./circleci.md), [local testing guide](./testing.md),
[GitHub protections](./github.md), and [release runbook](./releases.md). Work in
this order. Record completion dates and exact SHA/run/deployment evidence. Every
item below is deliberately open until its acceptance has been demonstrated;
repository implementation alone does not complete platform setup or testing.
Never include credentials, browser state, databases or private response bodies.

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

- [x] **CCI-003.** Create the Portfolio and isolated Portfolio Preview projects.
      Set the Portfolio trigger to same-repository PRs/default-branch pushes and
      target main. Set Preview config/checkout to main with no push/PR trigger.
      Record project IDs, pipeline definition IDs and the main project slug.

    **Where:** CircleCI → Projects → Create Project → Project Setup. See the
    [project setup instructions](./circleci.md#projects-and-triggers).

- [x] **CCI-004.** Install Node 24, pinned pnpm, OpenSSL, all Playwright browsers
      and required system libraries locally. Run the explicit Husky installation
      in every clone/worktree used for commits or pushes.

    **Where:** Local terminal → [developer setup](./testing.md#developer-setup).
    Implementation approval does not authorize agents to run verification.

- [ ] **CCI-005.** On a disposable local branch, demonstrate both hooks run the
      complete production suite and a browser failure blocks both commit and push.
      Confirm API, all three desktop engines, mobile and CSP projects run, cleanup
      succeeds and an active development build remains intact.

    **Where:** Local terminal → authorized commit/push verification. Record test
    output and the tested working-tree state privately; never push a failing branch.

## Pipeline and controller acceptance

- [ ] **CCI-006.** Prove the seven CircleCI validation jobs on the migration PR:
      quality, tests/coverage, migrations, browser-free production build/smoke,
      dependencies, secrets and CodeQL. Confirm frozen pnpm installation, no
      caches, no Playwright invocation and no browser downloads.

    **Where:** CircleCI → Portfolio → migration PR pipeline → job results.

- [ ] **CCI-007.** Prove CodeQL severity blocking and trusted-main SARIF publication;
      disable duplicate GitHub default CodeQL setup. Retain the dependency graph,
      Dependabot alerts/updates, native secret scanning and push protection.
      Resolve historical exposed credentials and review bypass permissions.

    **Where:** CircleCI security jobs; GitHub → Settings → Code security and
    Security → Code scanning / Secret scanning. Carries forward 038–041 and 160.

- [ ] **CCI-008.** Configure every context and its project/main/SSH/config-source
      restrictions. Obtain the read-scoped CircleCI API token and owner UUID.
      Issue narrowly scoped GitHub credentials and migrate provider secrets from
      private storage. Keep release activation false until the controlled drill.

    **Where:** CircleCI → Organization Settings → Contexts and User Settings;
    provider token dashboards; [credential matrix](./circleci.md#credentials).

- [ ] **CCI-009.** Demonstrate controllers reject wrong projects, checkouts,
      workflows, SHAs, approval roles/actors and missing/expired approvals.
      Confirm fresh actual main-push validation is required; newer failed/pending
      scans block release and stale results cannot be reused.

    **Where:** CircleCI → controller test results; isolated owner-operated release
    rehearsal. Carries forward 053 and the applicable 251–255 drills.

- [ ] **CCI-010.** Run service contracts from trusted main using only nonproduction
      resources. Prove ownership fingerprint checks, success/failure cleanup and
      interrupted-run reconciliation. Confirm production schema/ledger and
      compatibility guards remain enforced.

    **Where:** CircleCI → Run Pipeline → task `contracts`; isolated Turso/Blob
    dashboards; [services guide](./services.md). Carries forward 256–257 and 261.

- [ ] **CCI-011.** Connect the GitHub deployment-status webhook to the isolated
      Preview project. Prove successful Preview events automatically run HTTP
      smoke checks; ping/failure/production events are ignored, other repositories
      and fork-only/superseded sources are rejected, and credentials stay private.
      Run authenticated Preview browser acceptance locally when applicable.

    **Where:** GitHub → Settings → Webhooks → Recent Deliveries; CircleCI →
    Portfolio Preview; local `pnpm test:preview`. See [Preview setup](./circleci.md#automatic-preview-smoke).

## Cutover, release and ongoing ownership

- [ ] **CCI-012.** Prove missing/failed/cancelled/skipped gates block merging and
      release. Rehearse failed contracts, drift, build/smoke failures, changed main,
      rejected approval, canonical smoke failure and interrupted cleanup safely.

    **Where:** Disposable PR/local branch and isolated CircleCI/provider resources.
    Carries forward applicable historical 251–261; do not mutate production for drills.

- [ ] **CCI-013.** After the seven checks genuinely appear on the migration PR,
      replace old Actions required checks with their exact CircleCI names and
      source. Preserve PR-only main updates, up-to-date branches, conversation
      resolution, force-push/deletion restrictions and CodeQL severity enforcement
      through the required CircleCI check. Retire native required-tool rules that
      still wait for PR/Actions analyses; main SARIF/alerts remain active.
      A final Actions rerun is not required for this cutover.

    **Where:** GitHub → Settings → Rules → Production main → required checks.
    Record the actual emitted names and a failing-check rejection example.

- [ ] **CCI-014.** Merge the reviewed migration with all six repository Actions
      workflows removed. Retain only Dependabot's package updater and native
      security features. Confirm no old default CodeQL or custom workflow remains
      active. Retain historical run/evidence links and shared Git history.

    **Where:** GitHub → migration PR / Actions / Code security / Dependabot.
    Standard Dependabot update jobs may remain visible in Actions; they do not
    consume the included Actions minutes.

- [ ] **CCI-015.** Retain successful main-validation evidence for the exact merged
      SHA. Enable daily security and weekly CodeQL schedule triggers; prove their
      first runs. Review actual credits, resource memory and projected monthly
      usage against the free allowance before considering setup complete.

    **Where:** CircleCI → Portfolio → pipelines / Project Setup → Schedules;
    organization → Plan / Usage. Never enable paid overage to make a check pass.

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
