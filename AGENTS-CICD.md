# CI/CD

The root pre-commit policy is authoritative. Do not run local validation until the
user explicitly requests a commit. Approval to implement, install dependencies,
or edit tests is not that request. Preserve the dedicated pre-commit subagent,
its model/effort/Fast Mode requirements, and all nine checks.

GitHub Actions is a separate automated execution context. It must validate PRs
and merged commits without waiting for an agent or a commit request. Never disable
CI to satisfy the local agent restriction.

## Ownership

- [Implementation brief](./agent-instructions/implement-ci-cd.md) defines task scope.
- [Operations](./docs/operations/README.md) owns platform setup and release runbooks.
- [Testing](./AGENTS-TESTING.md) owns test layers and fixture conventions.
- [Security](./AGENTS-SECURITY.md) owns application security boundaries.

## Changes to workflows and releases

- Use short-lived branches and PRs. `main` is production; `restructure` triggers
  exist temporarily for the history-preserving branch transition.
- Keep required job names stable. Changes need a coordinated ruleset update.
- Pin Actions to reviewed full commit SHAs with version comments. Dependabot PRs
  update Actions; review executable changes before merging.
- Root workflow permissions are empty. Grant only each job's actual permissions.
- Never run PR source, generated scripts, or downloaded PR artifacts with privileged
  tokens. Do not use `pull_request_target` for validation.
- Production releases run trusted `main` controller code. Recheck the exact merged
  SHA and fresh CI/security results after the human approval wait.
- Do not add caches for dependencies, browser downloads, build artifacts, or `.next`.
  Public Cache Components, ISR, data caching, and CDN behavior remain intentional.
- Keep `vercel.json` production Git builds disabled. Explicit promotion requires a
  protected GitHub environment with a configured required human reviewer.
- Native Vercel Deployment Checks are not used by this Hobby staged architecture;
  never describe an automatic check as human approval.

## Database and storage

- Production schema changes use committed SQL, journal/snapshot metadata, reviewed
  hashes, and an explicit expand/contract classification. Do not edit old migrations.
- `migrate:apply` checks the ledger and serializes writers. Production requires the
  protected migration environment, current SHA, approval, and a recovery reference.
- Existing databases without a ledger require the approved baseline operation;
  unknown schema drift blocks release. Never insert a ledger blindly.
- Remote tests create `ci-*` databases in a separate nonproduction group and delete
  only their owned resource. Never clone production records into test fixtures.
- Preview and production have separate Turso databases, auth secrets/identities,
  and Blob stores/tokens. Do not infer isolation from environment labels alone.
- Test fixtures require CI, `APP_ENV=test`, an owned temporary directory, and no
  Vercel runtime. Never add production test endpoints or disable auth/CSRF/SSRF checks.

## Observability and diagnostics

Use classified JSON logs and bounded operation names. Do not log arbitrary Error
objects, request bodies, tokens, full upstream URLs, sessions, or private records.
SDK data collection must remain explicitly minimized. Do not add duplicate SDKs,
Replay, console forwarding, profiling, or production traces/screenshots casually.

Upload only synthetic local test diagnostics with short retention. Release evidence
contains IDs, SHA, workflow run, time, and state; never credentials or response bodies.
Do not claim external platform setup or successful verification without evidence.
