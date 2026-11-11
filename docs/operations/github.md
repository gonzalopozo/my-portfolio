# GitHub protections after the CircleCI migration

GitHub remains the source repository and the owner of branch protections,
Dependabot, native secret protection, code-scanning alerts and deployment records.
CircleCI executes all custom repository workflows. Start with the
[CircleCI guide](./circleci.md) and [migration checklist](./ci-cd-todo.md).
The prior Actions setup and its completed work are retained in
[rollout history](./ci-cd-github-actions-history.md).

## Main branch ruleset

Under **Settings → Rules → Rulesets**, retain the active **Production main**
ruleset targeting exact main, with:

- PRs required, conversation resolution and branches up to date.
- Zero independent approvals for the documented solo-maintainer workflow, plus
  deliberate owner review. Raise this when another maintainer joins.
- Block force pushes and branch deletion; no routine bypass actors/applications.
- Restrict updates off: with no bypass actors that setting also blocks PR merges.
- Required validation checks, including the CircleCI CodeQL error/high/critical gate.

After the migration PR has genuinely run, replace the old `CI / Required`,
`Security / Dependencies`, `Security / Secrets`, `Security / CodeQL JS` and
`Security / CodeQL Actions` requirements with the seven checks emitted for
CircleCI jobs `quality`, `tests`, `migrations`, `build`, `dependencies`, `secrets`
and `codeql`. Select the CircleCI source wherever GitHub offers a source binding.
Copy the actual names from the PR; do not assume their provider prefix.

Do this coordinated switch while the green CircleCI migration PR is open,
**before** merging the removal of the Actions workflows. Do not require both
providers when Actions capacity is exhausted. Retain the other rules and prove a
failed/missing/cancelled/skipped CircleCI gate cannot merge. After merge, retain
new evidence for the exact main commit.

Keep Preview, release, scheduled-only and deployment approval jobs outside the
merge-required set. Leave Require deployments to succeed before merging off.
Local hooks run Playwright, but a GitHub ruleset cannot prove that a local hook
ran: owner review must account for web/bot-created commits and hook bypasses.

## Native security and dependency updates

Retain the dependency graph, Dependabot alerts, secret scanning and push protection.
Review existing historical secret alerts privately and rotate exposed credentials;
do not copy secrets into issues or artifacts. Review bypass permissions.

Keep `.github/dependabot.yml` package updates, including pinned Vitest/coverage
compatibility and the pnpm 12 compatibility task. Validate a real Dependabot PR
with CircleCI and review its manifest/lockfile/overrides before merging. If the
updater cannot handle the current pnpm lockfile, retain the evidence and use
reviewed manual updates rather than silently regenerating it with another tool.

The GitHub Actions updater entry is removed with the custom workflows. CircleCI
image digests and native binary pins receive weekly owner review. Standard
Dependabot-generated update jobs may still appear under Actions and do not consume
included Actions minutes. [Dependabot runner documentation](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-on-actions).

Configure CodeQL for external/advanced analysis and disable duplicate default
setup. CircleCI uploads JavaScript/TypeScript SARIF on trusted main and enforces
its own severity gate; PR analysis has no upload credential. Retire the obsolete
Actions-language requirement. PRs intentionally do not upload SARIF; the required
CircleCI `codeql` status enforces errors/high/critical findings before merge.
During cutover, replace any native required-tool rule waiting for PR/Actions
analysis with this required CircleCI gate. Retain the main CodeQL alerts and
release blocking checks; do not remove the CircleCI severity gate. Native
required-tool rules can be reintroduced only after a future trusted PR publisher
has separate acceptance evidence.
[External CodeQL documentation](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-cli).

## Credentials, environments and cutover

CircleCI does not receive the former automatic `github.token`. Issue the
single-repository fine-grained credentials in the [context matrix](./circleci.md#credentials).
Ordinary PR code gets no context or deployment credential. External forks do not
run CI. Do not replace the separation with one account-wide PAT.

The former GitHub environment reviewer gates no longer approve CI execution.
Migration/promotion approval occurs in CircleCI, with current-workflow owner
identity verification. Keep historical GitHub deployment records and environment
history for audit and rollback compatibility. Do not treat creating or updating a
Deployment record as recording a new human approval.

After CircleCI acceptance, remove obsolete Actions secrets. Do not delete the
old deployment history or tokens before recovery is documented. No custom
`.github/workflows` files should remain, and GitHub default CodeQL setup must stay
off. Disabling Actions alone is not a substitute for removing the custom workflows.

The completed history-preserving restructure-to-main transition remains historical
work. Do not rewrite shared history, reset main or remove Vercel's main deployment
safeguard as part of this migration. Cleanup of the retired restructure branch's
remaining configuration is a separate backlog item.
