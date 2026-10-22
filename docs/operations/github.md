# GitHub setup — owner actions

These steps are not performed by repository files. The repository was public and
its default branch was `restructure` during investigation. Public GitHub security
and environment features are the target; re-evaluate paid feature availability
before changing visibility or moving accounts.

## 1. Preserve history and establish main

1. Freeze Vercel automatic production promotion first.
2. Open a baseline PR with base `main` and compare `restructure` after the CI/CD
   branch has been reviewed into the current development line. The investigation
   found `restructure` 502 commits ahead, 0 behind `main`; recheck the current graph.
3. Use **Create a merge commit** for this baseline. Do not squash 502 historical
   commits, rebase shared history, force-push, delete `main`, or reset it.
4. Ensure required workflows run on the baseline PR and on its merged `main` SHA.
   Until main contains the workflows, checks may need to complete before you can
   select their exact names in a ruleset; do not invent already-completed checks.
5. In **Settings → General → Default branch**, change the default to `main`.
6. Configure Vercel's production branch as `main`. Remove temporary `restructure`
   workflow triggers and its deployment-disable entry in a later focused PR after
   the branch is retired; never remove the `main` production deployment safeguard.

Normal feature PRs can use squash merge with a Conventional Commit PR title.
The quality job validates that title without interpolating it into shell code.

## 2. Actions policy

In **Settings → Actions → General**:

- Enable Actions with the reviewed GitHub/pnpm Actions used in the committed files.
- Enable the policy requiring full commit SHA pins where available. Match the
  allowlist to `actions/*`, `github/codeql-action`, `pnpm/action-setup`.
- Set default workflow permissions to **Read repository contents and packages**.
  Leave **Allow GitHub Actions to create and approve pull requests** disabled.
  Per-job permissions in YAML are narrower and remain authoritative.
- Require approval for workflows from external contributors. Do not enable sending
  write tokens or secrets to fork workflows. Review workflow changes before approval.
- Keep normal artifacts short-lived. Workflow diagnostics use three days; release
  identity evidence uses 90 days and contains no credentials.

There is no `pull_request_target`, privileged PR artifact execution, or automatic
production deployment on push. Do not replace these boundaries with a broad PAT.

## 3. Environments and credentials

In **Settings → Environments**, create all names below explicitly. Add secrets to
these environments, **not repository-wide secrets**, unless the table calls a value
nonsecret. Configure deployment branches/tags to **Selected branches and tags →
Branch: `main`**, with no wildcard and no tag policy.

| Environment             | Required reviewer                    | Secrets                                                                                | Nonsecret variables                                                                                                   |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `release-candidate`     | Not required; only trusted main code | `VERCEL_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, production `HEALTH_READINESS_TOKEN` | Repository variables below                                                                                            |
| `production-migrations` | Owner required                       | production `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`                                    | Recovery reference is entered per dispatch                                                                            |
| `production`            | Owner required                       | `VERCEL_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`, production `HEALTH_READINESS_TOKEN` | Repository variables below                                                                                            |
| `service-contracts`     | Main-only; owner reviewer optional   | nonproduction-organization `TURSO_API_TOKEN`, `NONPRODUCTION_BLOB_TOKEN`               | `TURSO_NONPRODUCTION_ORG`, `TURSO_NONPRODUCTION_GROUP=ci-contracts`, `CONTRACT_BLOB_ORIGIN`, `PRODUCTION_BLOB_ORIGIN` |
| `preview-checks`        | Main-only controller                 | `VERCEL_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET`                                      | Project/team variables                                                                                                |
| `preview-acceptance`    | Owner required                       | `VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_ADMIN_EMAIL`, `PREVIEW_ADMIN_PASSWORD`     | Synthetic Preview deployment only                                                                                     |

For the two production environments:

1. Add your GitHub account under **Required reviewers**.
2. Leave **Prevent self-review** unchecked: a solo maintainer must be able to
   deliberately approve a release they initiated.
3. Turn off **Allow administrators to bypass configured protection rules**.
4. Save the exact main-only branch policy. The controller checks reviewer presence,
   the policy, and review history. Bypass prohibition still needs dashboard review.

Repository **Settings → Secrets and variables → Actions → Variables**:

- `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`.
- `PRODUCTION_ORIGIN`, e.g. the canonical HTTPS origin without a path/query.
- Nonproduction service variables may instead live in `service-contracts` as above.

`VERCEL_TOKEN` must be scoped to the correct owner/team/project as the account's
current token controls permit. Do not assume Vercel offers GitHub OIDC credentials
for these management API operations. Prefer a restricted token and short expiry;
rotate it. The migration job gets no Vercel token; promotion gets no database token.

Protected environments and reviewer features are available for public repositories
on supported GitHub plans. If the UI/API cannot enforce these settings, **stop
release activation**; do not replace human approval with `workflow_dispatch` alone.
See [GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## 4. Ruleset for main

In **Settings → Rules → Rulesets → New branch ruleset**:

1. Name: `Production main`. Enforcement: **Active**. Target branch: exact `main`.
2. Do not add routine bypass actors or applications.
3. Enable **Restrict deletions** and **Block force pushes**.
4. Enable **Require a pull request before merging**. The approved solo workflow uses
   **0 required independent approvals**, with deliberate owner review before merge.
   A sole author cannot provide an independent PR approval. Increase this when a
   second maintainer joins; do not configure an impossible solo approval policy.
5. Require conversation resolution. No routine direct feature pushes to `main`.
6. Enable **Require status checks to pass** and **Require branches to be up to date**.
7. Select these exact check names after their first genuine run, using GitHub Actions
   as the expected source where the UI supports it:
    - `CI / Required`
    - `Security / Dependencies`
    - `Security / Secrets`
    - `Security / CodeQL JS`
    - `Security / CodeQL Actions`

8. Do not require Preview checks, release jobs, scheduled-only checks, or every
   internal CI job separately. The aggregate required job already requires all four
   correctness gates and fails on failed, cancelled, or skipped dependencies.
9. If available, add **Require code scanning results** with CodeQL, errors and
   high/critical security alerts. The SARIF severity gate also makes the CodeQL
   status fail on high/critical/error findings; analysis completion alone is not
   treated as a clean scan. The release controller independently checks open alerts.
10. Save, then verify against a disposable PR: failing test blocks merge; an obsolete
    PR run is cancelled; a new main commit makes the PR out of date; direct push,
    force push and deletion are rejected. Do not bypass failures to complete this drill.

Strict up-to-date PR validation plus post-merge `push: main` testing covers both
GitHub's proposed merge commit and the actual merged commit. A merge queue is not
needed for this solo repository. If enabled later, add `merge_group` triggers to
all required workflows before making the queue mandatory.

## 5. Security features

In **Settings → Advanced Security** (or **Code security / Secret protection**):

- Enable the dependency graph, Dependabot alerts and Dependabot security updates.
- Enable repository-managed **advanced CodeQL**, and disable default setup to avoid
  duplicate analyses. Committed workflows analyze JS/TS and Actions without a build.
- Enable native secret scanning and push protection, including eligible custom
  patterns for Turso/Blob/other credentials. Restrict bypasses and review alerts.
- Review existing history findings and rotate exposed credentials; deleting a line
  or rewriting Git history alone does not revoke a secret. Never paste a secret in
  an issue, log, test artifact, or incident document.

Gitleaks adds a fully redacted PR-range scan and scheduled full-history scan. It
excludes `.specstory` before content collection, in accordance with the owner's
agent boundary. Native GitHub scanning has its own scope; the owner handles its
historical alerts. Do not add a broad false-positive baseline or ignore all history.

Dependabot's ecosystem key is `npm` for pnpm manifests. **pnpm 12 compatibility is
an activation prerequisite**: the official supported-version matrix inspected for
this work did not establish pnpm 12 support (it listed pnpm through 10). Verify a
real bot PR preserves policy and passes frozen pnpm 12 installation. If the updater
cannot generate this lockfile, keep alerts/Actions updates enabled, stop broken
manifest-only PRs, and use reviewed manual pnpm update PRs until support arrives.
Do not downgrade pnpm or relax the release-age policy to make the bot green.
See [Dependabot ecosystems](https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories).

Weekly version updates are grouped for React, Next, Vitest, minor development
updates, and Actions. Security updates remain urgent. No bot receives an automatic
merge exemption. A critical framework patch goes through a focused PR, a reviewed
version-specific release-age exception if necessary, complete required checks, and
an approved staged release. Never automate `pnpm audit --fix` on main.
