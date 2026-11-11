# CI/CD

The root local-verification policy is authoritative. Implementation approval does
not authorize local checks. Preserve the dedicated pre-commit subagent, its
model/effort/Fast Mode requirements and all nine checks. An explicit push request
additionally authorizes the mandatory local production Playwright gate.

CircleCI validates PRs and merged commits automatically in its separate context.
All Playwright execution, including API projects and hosted Preview acceptance,
is local. Never introduce browser downloads or browser execution into cloud CI.

## Ownership

- [Migration brief](./agent-instructions/migrate-ci-to-circleci.md) defines current scope.
- [Operations](./docs/operations/README.md) owns account setup and release runbooks.
- [CircleCI setup](./docs/operations/circleci.md) owns contexts, tokens and triggers.
- [Testing](./AGENTS-TESTING.md) owns test layers and fixture conventions.
- [Security](./AGENTS-SECURITY.md) owns application security boundaries.

## Workflows, credentials and releases

- Use short-lived branches/PRs. Main is production; preserve shared Git history.
- Required job names/source changes need a coordinated GitHub ruleset update after
  actual CircleCI checks appear. Do not leave obsolete Actions checks blocking main.
- Pin executor images by digest and native tools by reviewed version/URL/checksum.
  Preserve frozen pnpm installs, ignored lifecycle scripts and existing risk gates.
- No dependency, Docker-layer, browser, build or `.next` restore caches. Legitimate
  runtime Cache Components, ISR and CDN behavior remain intentional.
- No deployment credentials in ordinary PR jobs or Portfolio project variables.
  Contexts must restrict project, main, SSH reruns and API-supplied config overrides.
- Fork contributions are excluded. The automatic Preview controller has a separate
  fixed-main project; webhook payloads may never select checkout or executable code.
- Production operations use trusted main, exact SHA/fresh result checks, scoped
  owner approval holds, and a serial job group spanning the whole operation.
- CircleCI metadata credentials must be read-scoped. Never give automation the
  owner's write-capable API token or invoke automatic approval endpoints.
- Keep `CIRCLECI_RELEASES_ENABLED=false` until deliberate owner activation.
- Keep Vercel main Git builds and automatic production domain assignment disabled.
  Promotion requires recorded owner approval for the current workflow and candidate.
  Native Vercel Deployment Checks do not replace that gate.
- Keep GitHub Deployment payloads compatible with previous successful release
  records. Retain native Dependabot, alerts and push protection; remove custom
  Actions workflows and the obsolete Actions-language CodeQL requirement.

## Database and storage

Production schema changes use immutable committed SQL, metadata, reviewed hashes
and expand/contract classification. Migration validates ledger/drift and serializes
writers. Require the exact current SHA, recorded migration approval and recovery
reference. Missing ledgers require an approved exact baseline, never blind insertion.

Remote contracts create empty owned `ci-*` resources in the nonproduction group,
using numeric CircleCI build identity plus an ownership fingerprint. Cleanup may
delete only that exact resource. Never copy production records into fixtures.
Preview and production have separate DB/auth/Blob credentials and identities.

Synthetic fixtures still require `CI=true`, `APP_ENV=test`, an owned temporary
directory and no Vercel runtime. The local browser runner sets deterministic CI
semantics internally; those flags do not mean browsers run in CircleCI. Preserve
real SQL/auth/CSRF/SSRF behavior and avoid production test endpoints.

## Diagnostics and evidence

Use classified JSON logs and bounded operation names. Do not log arbitrary errors,
request/response bodies, sessions, upstream credential URLs or private records.
Upload only explicitly selected coverage/SARIF/identity evidence, never all `.ci`,
databases, environment files, TLS keys or browser storage state.

Use short CircleCI retention and retain required release evidence in GitHub
Deployment records and private storage for at least 90 days. Historical Actions
checkmarks do not validate CircleCI setup. Record external acceptance only after
actual evidence; no local check or platform change is implied by a source edit.
