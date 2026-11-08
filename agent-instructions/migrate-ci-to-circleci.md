# Migrate CI to CircleCI

## Objective

Replace all six custom GitHub Actions workflows with native CircleCI workflows,
while running the full isolated production Playwright suite locally before every
commit and push. Follow the confirmed free-plan, automatic-Preview, no-fork scope.

## Context

The owner exhausted Actions capacity and has no CircleCI account yet. The existing
Vercel/Turso/Blob architecture, live deployment and immutable migration history
must survive migration. The active checklist is `docs/operations/ci-cd-todo.md`;
the original checklist is preserved as `ci-cd-github-actions-history.md`.

## Required behavior

- Same-repository PRs and actual merged main receive seven cloud gates, including
  browser-free production build/HTTP smoke and external CodeQL CLI analysis.
- Husky runs the complete API/desktop/mobile/CSP production browser suite at both
  commit and push; a failure blocks the operation and no result is reused.
- Automatic Preview HTTP smoke uses a separate fixed-main webhook project.
  Authenticated Preview browser acceptance is explicit and local.
- Release/migration/baseline/rollback verify immutable source, current SHA where
  applicable, fresh results, owner holds and serialized production operations.
- Context separation, scoped read-only CircleCI metadata, nonproduction resource
  ownership/cleanup and historical deployment compatibility remain enforced.
- Keep Dependabot package updates/native security. Remove custom Actions workflows,
  Actions updates and obsolete Actions-language scanning requirements.
- Account setup, context matrix, ruleset cutover, token rotation, cost limits and
  release/recovery acceptance are explicit owner tasks, never inferred completion.

## Constraints

Use pnpm only, add no application dependencies and preserve the no-cache policy.
CircleCI's Docker executor does not require local Docker. Do not run local checks
on implementation approval; retain the nine-check dedicated pre-commit policy.
Explicit push requests authorize the mandatory browser gate. No automatic commits,
pushes, account changes or production activation. Ignore `.specstory` entirely.
This brief supersedes the provider/fork/browser details of `implement-ci-cd.md`.

## Acceptance criteria

- No custom `.github/workflows` remain and no cloud job runs Playwright/downloads browsers.
- Both local hooks run the full isolated suite, preserve the development build and clean up.
- Missing/failed/skipped/cancelled/stale gates, mismatched source and wrong/missing
  owner approval fail closed. Newer failed scans cannot be hidden by old successes.
- Tokens cannot be sent to arbitrary platform URLs or used for automatic approval.
- Fork-only Preview sources and cleanup resources with mismatched identity are rejected.
- The old checklist/evidence is retained and new external acceptance items remain open.

## Verification commands and execution context

CircleCI runs `pnpm ci:quality`, `pnpm test:coverage`, `pnpm migrate:check`,
`pnpm ci:build`, `pnpm audit --audit-level high`, `pnpm ci:secrets` and
`pnpm ci:codeql`. Protected workflows handle remote contracts/releases separately.
Local `pnpm test:e2e:local` runs from commit/push hooks; `pnpm test:preview` is
owner-operated hosted acceptance. When a commit is explicitly requested, perform
all nine root checks through the required dedicated subagent, plus the browser
gate. Validation/config compilation and account-side drills require actual evidence.
