# CI/CD implementation to-do list

One owner checklist consolidated from [GitHub setup](./github.md),
[release and recovery](./releases.md), [services](./services.md),
[testing](./testing.md), and [Vercel setup](./vercel.md). The order follows
rollout dependencies across the guides. Item numbers stay fixed when obsolete
tasks are removed, so gaps are intentional.

Work through the remaining items in order. For a conditional task that does not
apply, record the reason before marking it complete. Existing checked items retain
the owner's recorded progress. When acceptance criteria change, retain evidence
for the updated behavior and exact commit; an older checkmark does not validate
new code or establish an external account setting.

The local baseline already passed on 2026-10-20: 606 tests across 61 files,
coverage gates, migration replay and the isolated production build. The CI tasks
below establish evidence for the actual PR and merged release SHA. This historical
baseline does not verify subsequent changes.

Progress recorded on 2026-10-27: the repository is now
[`gonzalopozo/my-portfolio`][gh-repo], with `main` as its default branch.
[Baseline PR #1][baseline-pr] merged `restructure` into `main` on 2026-10-25 through
the history-preserving [merge commit `45085d5`][baseline-merge]. For the reviewed
[`main` commit `4bec06b`][reviewed-main], the [CI][main-ci-evidence],
[Security][main-security-evidence] and [CodeQL][main-codeql-evidence] push runs
completed successfully. These links describe that commit only; later commits and
release dispatches need their own fresh evidence. Vercel configuration, required
reviewers, rulesets, hosted acceptance and release completion remain separate tasks.

Record completion dates and evidence such as workflow links, deployment IDs or
private settings notes. Keep credentials, database exports, browser storage state
and private response bodies outside this checklist and GitHub artifacts.
Commands and drills refer to owner-operated work or their GitHub workflow context;
agents remain subject to the root local-verification and pre-commit policy.

Each item includes a **Where** line with the site and the relevant dashboard area.
GitHub links open this repository. On Vercel and Turso, select the intended
project or organization after opening the link.

**Local terminal/editor** means this repository on your computer. **Private
operations notes** means your existing private document or credential manager.
**Preview/candidate/production site** means the verified deployment URL opened in
your browser. Rehearsal repositories and resources are isolated disposable copies.

For automated CI assertions, open the named workflow run and review its results;
the commands execute in GitHub Actions. Preview acceptance is an option within the
**Preview checks** workflow. Release approvals use **Review deployments** in GitHub
Actions. Dashboard menu names and available controls depend on your account.

- [x] **001.** Confirm the repository's current default branch, visibility, branch history
      and linked Vercel project; treat historical branch counts and plan limits in the guides
      as information to recheck.

    **Where:** [GitHub settings][gh-settings] → General and Branches; [GitHub
    repository][gh-repo] → commit history; [Vercel][vercel] → project → Settings → Git.

- [x] **002.** Confirm your GitHub and Vercel accounts can enforce the documented
      protected environments, reviewer approvals, deployment protection and staged promotion
      before enabling production releases.

    **Where:** [GitHub settings][gh-settings] → Environments and account billing;
    [Vercel][vercel] → team billing and project → Settings → Deployment Protection.

- [ ] **003.** Record the current production deployment ID, full Git SHA, canonical HTTPS
      origin and previous recovery option in private operations notes.

    **Where:** [Vercel][vercel] → project → Deployments → current production deployment and
    Domains; save the IDs and recovery option in private operations notes.

- [x] **004.** Disable automatic production domain assignment in the existing Vercel
      project; confirm `autoAssignCustomDomains` is false.

    **Where:** [Vercel][vercel] → project → Settings → Environments → Production → Branch
    Tracking → Auto-assign Custom Production Domains; use the project API from your terminal
    if the toggle is unavailable. See the [staged-deployment setting
    instructions][vercel-staging].

- [x] **005.** Identify and disable any scheduled job, deploy hook or integration that
      could independently promote a production deployment.

    **Where:** [Vercel][vercel] → project → Settings → Git / Deploy Hooks and integrations;
    [GitHub Actions][gh-actions] → deployment workflows; inspect any separately configured
    scheduler.

- [x] **006.** Keep native Vercel GitHub Deployment Checks disabled for this architecture
      so their success cannot replace the separate human approval gate.

    **Where:** [Vercel][vercel] → project → Settings → Git → Deployment Checks.

- [x] **007.** Ensure the committed `vercel.json` safeguards disabling automatic Git
      deployments for `main` and transitional `restructure` reach the project before changing
      production branches.

    **Where:** Local editor and [GitHub pull requests][gh-prs] → review the committed
    [vercel.json](../../vercel.json); [Vercel][vercel] → project → Settings → Git.

- [x] **008.** Keep the current production deployment available throughout setup and
      record how to restore it if the first new release fails.

    **Where:** [Vercel][vercel] → project → Deployments → current and previous production
    deployments; private operations notes for the restore procedure.

- [x] **009.** Identify the actual production Turso database and inspect its schema and
      `__drizzle_migrations` ledger privately.

    **Where:** [Turso][turso] → production organization → database details; inspect schema
    and ledger through its SQL console or the Turso CLI in your terminal.

- [x] **010.** Confirm the production database's current recovery window and prepare a
      verified backup or recovery point; store private exports outside GitHub artifacts.

    **Where:** [Turso][turso] → production database recovery options and organization plan;
    your terminal for an export, with the backup in private storage.

- [x] **011.** Record whether production already has a valid migration ledger, has no
      ledger, or has schema drift that needs reconciliation.

    **Where:** Private operations notes, using the production schema and ledger inspected in
    [Turso][turso] or the Turso CLI.

- [x] **012.** Create or confirm a dedicated nonproduction Turso organization when the
      available management token would otherwise grant access to production databases.

    **Where:** [Turso][turso] → organization switcher / organization settings; create or
    select the nonproduction organization.

- [x] **013.** Create a dedicated `ci-*` Turso group, such as `ci-contracts`, for
      disposable remote contract databases.

    **Where:** [Turso][turso] → nonproduction organization → database groups; use the Turso
    CLI from your terminal if group creation is not exposed there.

- [x] **014.** Create a separate Preview Turso database containing synthetic data rather
      than a clone of production records.

    **Where:** [Turso][turso] → nonproduction organization → Databases → create the Preview
    database.

- [x] **015.** Check Turso database-count, storage, row and request quotas leave room for
      Preview and temporary contract databases.

    **Where:** [Turso][turso] → nonproduction organization → usage and plan limits.

- [x] **016.** Create a database-scoped Preview application token and retain the separate
      production database credentials.

    **Where:** [Turso][turso] → Preview database → connection credentials / database tokens,
    or the database-token command in the Turso CLI; store the token privately.

- [x] **017.** Create the nonproduction Turso management token used by the protected
      service-contract workflow; confirm its scope excludes production management.

    **Where:** Local terminal → Turso CLI or management API token creation, authenticated to
    the nonproduction organization; confirm the organization in [Turso][turso].

- [x] **018.** Apply the reviewed committed migrations to the isolated Preview database
      using `pnpm migrate:apply` with its Preview URL/token and `APP_ENV=preview`.

    **Where:** Local terminal in this repository → run the documented migration command with
    only the isolated Preview credentials; inspect the resulting database in [Turso][turso].

- [x] **019.** Provision a dedicated synthetic Preview administrator using Better Auth
      password hashing while keeping public registration disabled.

    **Where:** Local terminal → follow the [Preview account setup instructions](./services.md#create-the-preview-administrator)
    using `.env.preview.local` and `scripts/provision-preview-admin.mts`.

- [x] **020.** Record the Preview administrator's stable user ID for `ADMIN_USER_IDS` and
      keep the production administrator allowlist independent.

    **Where:** [Turso][turso] → Preview user record, inspected privately; [Vercel][vercel] →
    project → Settings → Environment Variables → Preview → ADMIN_USER_IDS; private
    credential storage.

- [x] **021.** Create or confirm a nonproduction Vercel Blob store for Preview and
      contract tests, separate from the production store.

    **Where:** [Vercel][vercel] → team / project → Storage → Blob → create or select the
    nonproduction store.

- [x] **022.** Create the nonproduction Blob token and record the exact nonproduction and
      production public store origins.

    **Where:** [Vercel][vercel] → Storage → each Blob store → credentials and public URL;
    keep the token in private credential storage.

- [x] **023.** Confirm the nonproduction Blob token's store identity matches the intended
      nonproduction origin before uploading a contract object.

    **Where:** [Vercel][vercel] → Storage → nonproduction Blob store details; compare its
    identity privately with the token configuration in your terminal.

- [x] **024.** Review Blob storage, retention and operation quotas for both stores.

    **Where:** [Vercel][vercel] → Storage → each Blob store → usage; team usage / billing
    for the applicable quotas.

- [x] **025.** Generate independent Preview and Production `BETTER_AUTH_SECRET` values and
      independent `HEALTH_READINESS_TOKEN` values.

    **Where:** Local terminal or your existing password manager → generate and store the
    four independent secrets privately.

- [x] **030.** Create a Vercel management token scoped as narrowly as the account permits
      and record its expiry and rotation owner privately.

    **Where:** [Vercel account tokens][vercel-tokens] → create the management token; record
    expiry and ownership in your private credential manager.

- [x] **031.** Create the Vercel Protection Bypass for Automation credential and copy it
      only to the GitHub environments specified in this checklist.

    **Where:** [Vercel][vercel] → project → Settings → Deployment Protection → Protection
    Bypass for Automation; [GitHub environments][gh-environments] → the environments
    specified in items 057, 059, 063 and 064. See the [automation bypass
    instructions][vercel-bypass-docs].

- [x] **032.** Enable GitHub Actions for the repository and allow the reviewed
      `actions/*`, `github/codeql-action` and `pnpm/action-setup` actions used by the
      workflows.

    **Where:** [GitHub Actions settings][gh-actions-settings] → Actions permissions and
    allowed actions.

- [x] **033.** Enable the GitHub policy requiring full commit SHA pins for Actions where
      available.

    **Where:** [GitHub Actions settings][gh-actions-settings] → action SHA-pinning policy,
    or the repository owner's organization Actions policy if enforced there.

- [x] **034.** Set default GitHub workflow permissions to read repository contents and
      packages; retain narrower permissions in each job.

    **Where:** [GitHub Actions settings][gh-actions-settings] → Workflow permissions → Read
    repository contents and packages.

- [x] **035.** Leave GitHub Actions permission to create and approve pull requests
      disabled.

    **Where:** [GitHub Actions settings][gh-actions-settings] → Workflow permissions → leave
    Allow GitHub Actions to create and approve pull requests unchecked.

- [x] **036.** Require approval for workflows from external contributors and keep fork
      workflow tokens and secrets restricted.

    **Where:** [GitHub Actions settings][gh-actions-settings] → fork pull request approval
    and workflow policies.

- [x] **037.** Enable the GitHub dependency graph, Dependabot alerts and Dependabot
      security updates.

    **Where:** [GitHub settings][gh-settings] → code security settings → Dependency graph,
    Dependabot alerts and Dependabot security updates.

- [ ] **038.** Enable repository-managed advanced CodeQL configuration and disable
      duplicate default CodeQL setup.

    **Where:** [GitHub settings][gh-settings] → code security settings → Code scanning →
    advanced CodeQL configuration.

- [ ] **039.** Enable native secret scanning and push protection, including eligible
      credential patterns used by this application.

    **Where:** [GitHub settings][gh-settings] → secret scanning settings → Secret scanning
    and Push protection.

- [ ] **040.** Review existing secret-history alerts privately and rotate any exposed
      credential; record remediation without copying the secret into an issue or artifact.

    **Where:** [GitHub security][gh-security] → Secret scanning alerts; rotate each
    credential at the service that issued it and record remediation privately.

- [ ] **041.** Review secret-scanning bypass permissions and ensure the native scanning
      scope and owner responsibility for historical alerts are understood.

    **Where:** [GitHub settings][gh-settings] → secret scanning / push protection bypass
    policies; [GitHub security][gh-security] → historical secret alerts.

- [x] **042.** Create the GitHub environment `release-candidate`.

    **Where:** [GitHub environments][gh-environments] → New environment → release-candidate.

- [x] **043.** Create the GitHub environment `production-migrations`.

    **Where:** [GitHub environments][gh-environments] → New environment →
    production-migrations.

- [x] **044.** Create the GitHub environment `production`.

    **Where:** [GitHub environments][gh-environments] → New environment → production.

- [x] **045.** Create the GitHub environment `service-contracts`.

    **Where:** [GitHub environments][gh-environments] → New environment → service-contracts.

- [x] **046.** Create the GitHub environment `preview-checks`.

    **Where:** [GitHub environments][gh-environments] → New environment → preview-checks.

- [x] **047.** Create the GitHub environment `preview-acceptance`.

    **Where:** [GitHub environments][gh-environments] → New environment →
    preview-acceptance.

- [x] **048.** Restrict all six GitHub environments to the exact branch `main`, with no
      wildcard or tag deployment policy.

    **Where:** [GitHub environments][gh-environments] → each environment → Deployment
    branches and tags → selected branch main.

- [x] **049.** Add your account as a required reviewer for `production-migrations` and
      `production`.

    **Where:** [GitHub environments][gh-environments] → production-migrations and production
    → Required reviewers.

- [x] **050.** Leave Prevent self-review unchecked for the two production approval
      environments so the solo maintainer can approve an initiated release.

    **Where:** [GitHub environments][gh-environments] → production-migrations and production
    → deployment protection rules → Prevent self-review.

- [x] **051.** Disable administrator bypass of protection rules for both production
      approval environments.

    **Where:** [GitHub environments][gh-environments] → production-migrations and production
    → deployment protection rules → administrator bypass setting.

- [x] **052.** Require owner review for `preview-acceptance`; decide whether to require
      review for `service-contracts` as permitted by the guide.

    **Where:** [GitHub environments][gh-environments] → preview-acceptance and
    service-contracts → Required reviewers.

- [ ] **053.** Confirm `release-candidate` and `preview-checks` execute trusted `main`
      controller code even though they do not require a separate owner review.

    **Where:** [GitHub repository][gh-repo] →
    [release.yml](../../.github/workflows/release.yml) and
    [preview-checks.yml](../../.github/workflows/preview-checks.yml); [GitHub
    environments][gh-environments] → branch policies.

- [x] **054.** Set the repository variable `VERCEL_PROJECT_ID` to the verified existing
      project.

    **Where:** [Vercel][vercel] → project → Settings → General → Project ID; copy it to
    [GitHub variables][gh-variables] → Repository variables → VERCEL_PROJECT_ID.

- [x] **055.** If the project uses a Vercel team, set the repository variable
      `VERCEL_TEAM_ID` to that team.

    **Where:** [Vercel][vercel] → team settings → Team ID; copy it to [GitHub
    variables][gh-variables] → Repository variables → VERCEL_TEAM_ID.

- [x] **056.** Set the repository variable `PRODUCTION_ORIGIN` to the canonical HTTPS
      origin without a path, query or credentials.

    **Where:** [Vercel][vercel] → project → Settings → Domains; [GitHub
    variables][gh-variables] → Repository variables → PRODUCTION_ORIGIN.

- [x] **057.** Add `VERCEL_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET` and the production
      `HEALTH_READINESS_TOKEN` to `release-candidate`.

    **Where:** [GitHub environments][gh-environments] → release-candidate → Environment
    secrets.

- [x] **058.** Add the production `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to
      `production-migrations`.

    **Where:** [GitHub environments][gh-environments] → production-migrations → Environment
    secrets.

- [x] **059.** Add `VERCEL_TOKEN`, `VERCEL_AUTOMATION_BYPASS_SECRET` and the production
      `HEALTH_READINESS_TOKEN` to `production`.

    **Where:** [GitHub environments][gh-environments] → production → Environment secrets.

- [x] **060.** Add the nonproduction `TURSO_API_TOKEN` and `NONPRODUCTION_BLOB_TOKEN` to
      `service-contracts`.

    **Where:** [GitHub environments][gh-environments] → service-contracts → Environment
    secrets.

- [x] **061.** Set `TURSO_NONPRODUCTION_ORG` and `TURSO_NONPRODUCTION_GROUP` in
      `service-contracts` to the nonproduction owner slug and `ci-*` group. For a
      personal Turso account, the owner slug is your Turso username; the API calls
      personal accounts organizations too.

    **Where:** [GitHub environments][gh-environments] → service-contracts → Environment
    variables. The workflow also accepts same-named Environment secrets; variables
    take precedence. Keep the management token isolated from production as in item 012.

- [x] **062.** Set `CONTRACT_BLOB_ORIGIN` and `PRODUCTION_BLOB_ORIGIN` in
      `service-contracts` to the distinct exact public origins.

    **Where:** [GitHub environments][gh-environments] → service-contracts → Environment
    variables (same-named Environment secrets are also supported); obtain each store
    origin from [Vercel][vercel] → Storage.

- [x] **063.** Add `VERCEL_TOKEN` and `VERCEL_AUTOMATION_BYPASS_SECRET` to
      `preview-checks`.

    **Where:** [GitHub environments][gh-environments] → preview-checks → Environment
    secrets.

- [x] **064.** Add `VERCEL_AUTOMATION_BYPASS_SECRET`, `PREVIEW_ADMIN_EMAIL` and
      `PREVIEW_ADMIN_PASSWORD` to `preview-acceptance` using only the synthetic Preview
      account.

    **Where:** [GitHub environments][gh-environments] → preview-acceptance → Environment
    secrets.

- [x] **065.** Review the final credential scopes: ordinary PR jobs receive no platform
      secrets, migration jobs receive no Vercel token, and promotion jobs receive no database
      token.

    **Where:** [GitHub environments][gh-environments] → each environment's secrets; [GitHub
    repository][gh-repo] → workflow job environment declarations.

- [x] **066.** Remove any production credentials accidentally configured as
      repository-wide Actions secrets instead of the documented environment-scoped secrets.

    **Where:** [GitHub secrets][gh-secrets] → Repository secrets; move each misplaced
    credential to its designated [GitHub environment][gh-environments].

- [x] **067.** Enable the official Git integration for the verified existing Vercel
      project and confirm it links to the intended repository.

    **Where:** [Vercel][vercel] → project → Settings → Git → Connected Git Repository;
    GitHub installation permissions if reconnection is needed.

- [x] **068.** Set the Vercel framework to Next.js, the root directory to the repository
      root and the Node.js runtime to 24.x.

    **Where:** [Vercel][vercel] → project → Settings → Build and Deployment → framework,
    root directory and Node.js version.

- [x] **069.** Use the committed Vercel install and build commands and remove conflicting
      dashboard overrides.

    **Where:** [Vercel][vercel] → project → Settings → Build and Deployment; compare
    overrides with the committed [vercel.json](../../vercel.json).

- [x] **070.** Set `VERCEL_FORCE_NO_BUILD_CACHE=1` separately in Vercel Preview and
      Production.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → add
    VERCEL_FORCE_NO_BUILD_CACHE for Preview and Production.

- [x] **071.** Confirm Vercel has no `CI` fixture settings, `APP_ENV=test` or
      `TEST_FIXTURE_DIRECTORY` configured for hosted deployments.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables, including
    branch-specific Preview overrides.

- [x] **072.** Configure Preview `APP_ENV` as `preview`, and Production as
      `production`.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → Preview and
    Production selections.

- [x] **073.** Configure Preview `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the
      isolated synthetic database and token.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → Preview.

- [x] **074.** Configure Production `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` with the
      verified production database and token.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → Production.

- [x] **075.** Configure the independent `BETTER_AUTH_SECRET` in each Vercel environment.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → separate
    Preview and Production values.

- [x] **076.** Set Production `BETTER_AUTH_URL` to `https://www.gonzalopozo.dev`.
      Remove fixed Preview values and branch-specific overrides for this variable.
      Enable access to Vercel's System Environment Variables so hosted Preview auth
      automatically uses the validated `VERCEL_URL` for each deployment.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables →
    BETTER_AUTH_URL → Production; remove its Preview entries and enable access to
    System Environment Variables on the same page.

- [x] **077.** Configure Production `BETTER_AUTH_TRUSTED_ORIGINS` with the canonical
      origin. Leave Preview unset unless additional exact HTTPS aliases are needed:
      the validated deployment origin is trusted automatically. Use comma-separated
      exact origins for additional aliases; no wildcard or per-deployment entries.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables →
    BETTER_AUTH_TRUSTED_ORIGINS → Production; Preview only for additional aliases.
    Check the automatic deployment-origin behavior in `lib/auth.ts` in your editor.

- [x] **078.** Configure Preview `ADMIN_USER_IDS` with synthetic administrator IDs and
      Production with the existing trusted administrator IDs.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables →
    ADMIN_USER_IDS in Preview and Production.

- [x] **079.** Configure `BLOB_PREVIEW_PUBLIC_HOSTNAME` and
      `BLOB_PREVIEW_READ_WRITE_TOKEN` for Preview, and `BLOB_PUBLIC_HOSTNAME` and
      `BLOB_READ_WRITE_TOKEN` for Production, with each pair scoped to its environment.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables; obtain each
    store's hostname and token from Storage → Blob.

- [x] **080.** Configure Production Last.fm credentials and either a test account or an
      intentionally unset safe fallback in Preview.

    **Where:** [Last.fm API accounts][lastfm] → production / test API credentials;
    [Vercel][vercel] → project → Settings → Environment Variables.

- [x] **081.** Review whether the current music integration actually uses Spotify
      credentials; configure only the applicable existing credentials in the proper
      environment.

    **Where:** Local editor → current music integration configuration; [Spotify Developer
    Dashboard][spotify] if applicable; [Vercel][vercel] → project → Settings → Environment
    Variables.

- [x] **082.** Configure the independent `HEALTH_READINESS_TOKEN` in each Vercel
      environment, matching the production value stored in the protected GitHub jobs.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables; [GitHub
    environments][gh-environments] → release-candidate and production →
    HEALTH_READINESS_TOKEN.

- [x] **086.** Set `CSP_PUBLIC_MODE=enforce`, `CSP_ADMIN_MODE=enforce` and
      `CSP_ADMIN_POLICY=nonce` on the isolated Preview acceptance candidate.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → the isolated
    Preview deployment's CSP settings.

- [x] **087.** Leave `NEXT_PUBLIC_RELEASE_SHA` under the committed build configuration so
      it reflects the deployment's Git SHA.

    **Where:** Local editor → committed build configuration; [Vercel][vercel] → project →
    Settings → Environment Variables to remove any conflicting manual release-SHA override.

- [x] **088.** Enable Vercel Preview/generated-URL deployment protection supported by the
      account.

    **Where:** [Vercel][vercel] → project → Settings → Deployment Protection → protection
    for Preview and generated deployment URLs.

- [x] **089.** Require owner approval before deploying fork or other untrusted source with
      Preview credentials.

    **Where:** [Vercel][vercel] → project → Settings → Git → fork / untrusted deployment
    approval policy, then review incoming deployment approval requests.

- [x] **090.** Inspect the bypass credential's project-wide scope and disable its
      automatic exposure to untrusted deployment code wherever the account supports that
      control.

    **Where:** [Vercel][vercel] → project → Settings → Deployment Protection → Protection
    Bypass for Automation and its deployment exposure controls.

- [x] **091.** If bypass credential exposure cannot be isolated, keep untrusted fork
      deployments unapproved; provision a separate nonproduction Vercel project only if
      automatic untrusted previews become a requirement.

    **Where:** [Vercel][vercel] → fork deployment approval requests and project protection
    settings; team → Add New Project only if a separate untrusted Preview project becomes
    necessary.

- [x] **092.** Disable the Preview toolbar for CSP acceptance unless its additional
      origins have been separately reviewed.

    **Where:** [Vercel][vercel] → project → Settings → General → Vercel Toolbar → Preview
    setting.

- [x] **093.** Privately compare Preview and Production database, Blob, auth,
      administrator and readiness settings and confirm they are independent.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables and Storage;
    [Turso][turso] → Preview / Production database identities; compare in private notes.

- [x] **094.** Confirm the proposed branch transition will preserve all existing history;
      recheck the current `restructure` versus `main` graph rather than relying on the
      historical commit count.

    **Where:** Local terminal → inspect the Git branch graph; [GitHub repository][gh-repo] →
    compare restructure and main.

- [x] **095.** Publish the CI/CD feature branch through the normal reviewed PR process
      into the current development line.

    **Where:** Local terminal → push the feature branch; [GitHub pull requests][gh-prs] →
    New pull request targeting the current development line.

- [x] **096.** Use a Conventional Commit title for the normal feature PR and confirm the
      PR-title validation passes.

    **Where:** [GitHub pull requests][gh-prs] → feature PR → edit title and open Checks → CI
    / Quality → Check pull request title.

- [x] **097.** Confirm GitHub Actions runs the committed CI, Security and CodeQL workflows
      for that PR before merging it.

    **Where:** [GitHub pull requests][gh-prs] → feature PR → Checks; [GitHub
    Actions][gh-actions] → matching CI, Security and CodeQL runs.

- [x] **098.** Confirm the CI Quality job's `pnpm ci:quality` passes formatting, lint with
      zero warnings, generated Next.js types, TypeScript, spelling, unused-code analysis and
      dependency-boundary analysis.

    **Where:** [GitHub CI][gh-ci] → matching PR run → CI / Quality → pnpm ci:quality logs;
    this executes automatically in Actions.

- [x] **099.** Confirm the CI Tests job's `pnpm test:coverage` passes the complete unit,
      component and integration suites and uploads only synthetic coverage diagnostics.

    **Where:** [GitHub CI][gh-ci] → matching PR run → CI / Tests; run summary → Artifacts →
    synthetic coverage diagnostics.

- [x] **100.** Review the CI coverage report against the configured security/schema/admin
      gates of 90% statements, lines and functions and 85% branches.

    **Where:** [GitHub CI][gh-ci] → CI / Tests → coverage output and the run's coverage
    artifact.

- [x] **101.** Review the CI coverage report against the Server Action gates of 85%
      statements, lines and functions and 80% branches.

    **Where:** [GitHub CI][gh-ci] → CI / Tests → Server Action coverage output and the run's
    coverage artifact.

- [x] **102.** Confirm existing test scenarios remain covered when components and test
      files are split or replaced, unimported library/component sources remain visible in
      coverage, and exclusions do not hide application failures.

    **Where:** [GitHub pull requests][gh-prs] → Files changed → tests and coverage
    configuration; [GitHub CI][gh-ci] → CI / Tests → coverage artifact.

- [x] **103.** Confirm the CI Migrations job's `pnpm migrate:check` reports a clean
      schema, verifies reviewed SQL hashes and successfully replays every supported migration
      prefix with idempotent reapplication.

    **Where:** [GitHub CI][gh-ci] → matching run → CI / Migrations → pnpm migrate:check
    logs.

- [x] **104.** Confirm the Production E2E job installs fresh system dependencies and
      browsers in separate steps limited to eight and five minutes, then runs
      `pnpm test:e2e:prod`, building one fresh production output against its own migrated
      synthetic database. Retain the bounded download setup and no-cache policy.

    **Where:** [GitHub CI][gh-ci] → matching run → CI / Production E2E → Configure browser
    dependency downloads, Install Playwright system dependencies, Install Playwright
    browsers, production build and test logs.

- [x] **105.** Confirm the production runner smoke-tests `next start` on loopback before
      serving the same output through the local HTTPS harness. Node readiness probes and
      internal Server Action redirects must trust the harness-owned localhost certificate
      while preserving certificate and hostname validation. The runner configures its
      certificate and `NODE_EXTRA_CA_CERTS`; no manual local or Vercel variable is required.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → production runner / loopback smoke
    / HTTPS harness logs.

- [x] **106.** Confirm the API, Chromium, Firefox, WebKit and mobile Chromium projects all
      execute successfully.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → Playwright results for each
    browser and API project.

- [x] **107.** Confirm wrong-password login returns 401, disabled signup returns 400,
      foreign-origin authentication is rejected and login feedback remains generic.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → authentication
    status / origin test results.

- [x] **108.** Confirm login, session lookup, logout, expired sessions, missing/forged
      cookies and persistent authentication rate limiting pass through the real auth/database
      integration.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → real
    authentication, session and rate-limit results.

- [x] **109.** Confirm unauthenticated and authenticated non-admin sessions cannot read or
      mutate CMS data independently of proxy and page checks.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → CMS authorization
    and non-admin results.

- [x] **110.** Confirm project create, edit, association replacement and deletion pass
      through real Server Actions.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → project CRUD journey; CI / Tests →
    project Server Action results.

- [x] **111.** Confirm experience create, edit, association replacement and deletion pass
      through real Server Actions.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → experience CRUD journey; CI /
    Tests → experience Server Action results.

- [x] **112.** Confirm project and experience association failures roll back their parent
      writes without partial saves or cache invalidation.

    **Where:** [GitHub CI][gh-ci] → CI / Tests → transactional project / experience
    association failure results.

- [x] **113.** Confirm settings changes create exactly one employment-history event per
      transition and rollback preserves both settings and history on failure.

    **Where:** [GitHub CI][gh-ci] → CI / Tests → settings and employment-history transaction
    results.

- [x] **114.** Confirm successful CMS mutations expire the relevant data tags and
      invalidate the public HTML route, so content and icon changes appear without a
      redeploy. Keep the settings freshness check and confirm forged/non-admin action
      replay leaves both stored data and public content unchanged.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → cache invalidation,
    CMS icon selection, settings freshness and forged / non-admin replay results;
    local editor → Server Actions using data tags and `revalidatePath('/')`.

- [x] **115.** Confirm skill CRUD and deletion cascades preserve the expected project and
      experience relations.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → skill CRUD and
    relation cascade results.

- [x] **116.** Confirm custom SVG uploads reject unsafe files, normalize allowed SVGs,
      replace objects and delete owned obsolete files.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → SVG validation,
    replacement and owned-object cleanup results.

- [x] **117.** Confirm Open Graph acquisition and refresh persist new images, preserve
      prior images on failure and clean only managed objects belonging to the exact store and
      project. Include rejection of misleading project ID prefixes, leading-zero IDs,
      malformed managed filenames, credentials, queries, fragments and other store origins.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → Open Graph
    acquisition, refresh, ownership and cleanup results.

- [x] **118.** Confirm social-link CRUD, URL/color validation and persisted ordering pass.
      Select previously unused CMS icons from different supported packs and confirm the
      public SVG changes without a source edit or redeploy. Public browser scripts must not
      download the full icon catalogs or admin picker; icons resolve on the server.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → social-link
    validation, CRUD, ordering and CMS icon selection results; CI / Quality → the public
    icon dependency boundary in dependency-cruiser.

- [x] **119.** Confirm project ordering gaps normalize atomically and keyboard ordering
      for projects and social links survives reload.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → atomic ordering and
    keyboard ordering results.

- [x] **120.** Confirm public query results preserve relation joins, deterministic
      ordering, usage counts, safe projections and filtering of unused skills or skills
      without icons.

    **Where:** [GitHub CI][gh-ci] → CI / Tests → public query projection, relation, ordering
    and usage-count results.

- [x] **121.** Confirm public cached queries remain independent of authentication state
      and private query entrypoints enforce authorization.

    **Where:** [GitHub CI][gh-ci] → CI / Tests → public query cache isolation and private
    query authorization results.

- [x] **122.** Confirm delayed public queries still return card HTML that is readable
      before hydration. With JavaScript disabled, cards must remain visible without overlap
      or horizontal overflow at 390px, 820px and 1440px. Hydration must enhance the same card
      tree while preserving controls and responsive layout.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → delayed cache miss returns public
    card HTML before hydration and server-rendered portfolio results; the protected Preview
    site → browser settings / Developer Tools → repeat with JavaScript disabled.

- [x] **123.** Confirm a server-read failure displays generic feedback, hides private
      error details and recovers when Try again refreshes server data and resets the error
      boundary after the underlying failure is cleared. Keep application-alert assertions
      separate from the framework's route announcer.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → server-read failure, generic
    feedback and reset recovery results.

- [x] **124.** Confirm provider failure and subsequent music refresh recover safely,
      including the hosted Spotify fallback when Chromium is unavailable.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → provider failure /
    music refresh results; later inspect the hosted fallback on the Preview site in your
    browser.

- [x] **125.** Confirm the public page hydrates under enforced CSP, public policy remains
      static and script attributes are blocked.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → public CSP and hydration results.

- [x] **126.** Confirm admin/login CSP has fresh nonces and preserves login/logout across
      document boundaries. Verify a parser-inserted inline script without a nonce is blocked
      with an enforced policy violation, while a matching nonced control script executes.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → admin/login nonce, parser-inserted
    script probes and login/logout results in `e2e/csp.spec.ts`.

- [x] **127.** Confirm responsive layout, touch navigation, history, focus, theme
      switching and navigation/404 recovery pass in the configured browsers. MapLibre must
      load after a paint only when its card is visible and the browser is idle; the location
      preview and story trigger must remain usable if imports, WebGL or map resources fail.
      Verify keyboard opening, Escape dismissal and focus restoration on the fallback.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → responsive, mobile, focus,
    navigation, theme, map fallback and 404 results; CI / Tests → deferred-map scheduling,
    cancellation and fallback results.

- [x] **128.** Confirm public and login pages pass the automated WCAG A/AA assertions and
      the real map story button has an accessible name before the renderer loads and during
      fallback. Arrange manual review for accessibility behavior the automated scan cannot
      establish.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → accessibility results; the
    deployed Preview site in your browser / assistive technology for manual accessibility
    review.

- [x] **129.** Confirm liveness reports the built release without caching and readiness
      rejects missing/wrong credentials while checking real database schema and migration
      state.

    **Where:** [GitHub CI][gh-ci] → CI / Tests and CI / Production E2E → /api/health and
    /api/ready results.

- [x] **130.** Confirm CI traces/screenshots contain synthetic local data only, remote
      authenticated recordings remain disabled and workflow diagnostics retain their
      documented three-day lifetime. Confirm Blob fixture reads, writes and deletions stay
      within the normalized owned store directory and reject traversal, dot filenames,
      nested or unmanaged paths and hosted/non-test environments.

    **Where:** [GitHub Actions][gh-actions] → CI run → Artifacts and upload-step logs;
    [GitHub repository][gh-repo] → workflow retention and remote Playwright recording
    configuration; CI / Tests → Blob fixture path-boundary regression results.

- [x] **131.** Confirm a recovered flaky test still blocks CI; fix the cause instead of
      increasing retries, adding skips or lowering coverage gates.

    **Where:** [GitHub CI][gh-ci] → CI / Production E2E → flaky-test outcome and
    diagnostics; local editor for the fix, followed by the reviewed PR.

- [x] **132.** Confirm CI restores no dependency, browser, build-artifact or `.next` cache
      and frozen installation retains lifecycle-script and release-age protections.

    **Where:** [GitHub CI][gh-ci] → setup/install logs in each job; [GitHub
    repository][gh-repo] → workflow cache and pnpm policy configuration.

- [x] **133.** Confirm the Security Dependencies job passes the dependency audit and PR
      dependency review with no unresolved high/critical findings. Retain fresh evidence
      after dependency patches or removal of obsolete tooling; older audit results do not
      validate a changed manifest or lockfile.

    **Where:** [GitHub Security workflow][gh-security-workflow] → matching PR run → Security
    / Dependencies; PR → dependency review result.

- [x] **134.** Confirm the Security Secrets job passes its PR-range scan and the
      full-history scans used on pushes, scheduled runs and manual runs. Findings must show
      file, line, rule and commit with detected secret values fully redacted. Review the
      exact historical false-positive fingerprints in `.gitleaksignore`; new findings remain
      subject to scanning. Gitleaks must exclude `.specstory` before collecting content,
      with native historical alerts handled by the owner. Git history scans do not inspect
      Vercel environment variables, and credential rotation does not erase historical matches.

    **Where:** [GitHub Security workflow][gh-security-workflow] → PR, push and
    scheduled/manual Security / Secrets diagnostics; local editor → `.gitleaksignore` and
    `scripts/scan-secrets.mjs`; [GitHub security][gh-security] → native historical alerts.

- [x] **135.** Confirm the CodeQL JavaScript/TypeScript and Actions jobs both run and
      their SARIF gates block security severity scores of at least 7 and error-level
      findings. Inspect each printed blocking finding's rule, severity, file, line,
      column and message before choosing a repair.

    **Where:** [GitHub CodeQL][gh-codeql] → Security / CodeQL JS and Security / CodeQL
    Actions → Block high, critical and error findings; [GitHub security][gh-security] →
    Code scanning alerts. The [recorded CodeQL push run][main-codeql-evidence] is evidence
    for `4bec06b` only.

- [x] **136.** Resolve blocking security findings or document a narrowly proven false
      positive before merging future changes. For already merged repairs, retain the
      corresponding successful current-main scan and confirm the finding is resolved.
      Include the HTTPS certificate-validation and Blob ownership/path-containment repairs.
      Historical Gitleaks exceptions must identify the exact commit, file, rule and line,
      with a documented reason. Rotate real exposed credentials; deletion and scanner
      exceptions do not revoke access.

    **Where:** [GitHub security][gh-security] → alert details and dismissal / remediation
    record; local editor and PR for code fixes; issuing service dashboard for credential
    rotation.

- [x] **137.** Confirm `CI / Required` fails when any dependency fails, is cancelled or is
      skipped.

    **Where:** [GitHub CI][gh-ci] → matching run → CI / Required → dependency outcomes; use
    a disposable PR for failure-case evidence.

- [x] **138.** Confirm PR source and artifacts are never executed with privileged tokens,
      including fork PRs.

    **Where:** [GitHub pull requests][gh-prs] → workflow Files changed; [GitHub Actions
    settings][gh-actions-settings] → fork policies; Actions run → job permissions.

- [x] **139.** Fix all first-run CI, security and production-browser failures and rerun
      the affected workflows until the reviewed repair and current `main` are fully green.
      Retain exact-SHA evidence; the older failed run `40223383358` describes historical
      failures and is not the result for the repaired code.

    **Where:** Local editor → fix the reported failures; [GitHub pull requests][gh-prs] →
    reviewed repairs and Checks; [GitHub Actions][gh-actions] → current-main push runs,
    with the recorded successful `4bec06b` runs linked in item 144.

- [x] **140.** Record how the CI/CD implementation and reviewed follow-up repairs reached
      `main`, including baseline PR #1 and repair PRs #12 and #13. Retain each PR's review
      and actual check outcomes. Future feature and repair PRs target `main`.

    **Where:** [GitHub pull requests][gh-prs] → merged baseline / repair PRs → Files changed,
    reviews and Checks; [GitHub repository][gh-repo] → main commit history.

- [x] **141.** Record the completed history-preserving baseline PR from `restructure` to
      `main`: [PR #1][baseline-pr], merged on 2026-10-25.

    **Where:** [Baseline PR #1][baseline-pr] → merged state, base main and compare
    restructure; retain the existing PR as evidence rather than opening another baseline.

- [x] **142.** Review and retain the baseline PR's actual pre-merge CI and security
      results. Record any missing or failed historical gate and the follow-up repair / main
      validation that addresses it; a completed merge does not prove its checks passed.
      Future PRs must pass their required checks before merging.

    **Where:** [GitHub pull requests][gh-prs] → baseline PR → Checks → CI, Security and
    CodeQL.

- [x] **143.** Record the completed history-preserving baseline merge
      [`45085d5`][baseline-merge]. Its two parents preserve the previous `main` history and
      the `restructure` tip `d0262d3`; the shared baseline history remains available.

    **Where:** [Baseline PR #1][baseline-pr] and [merge commit `45085d5`][baseline-merge] →
    merged commit and parent history; local terminal → main / restructure graph.

- [x] **144.** Retain successful CI, Security and CodeQL push runs for the actual
      reviewed `main` commit. All three completed successfully for
      [`4bec06b`][reviewed-main] on 2026-10-27. Recheck after every subsequent main change;
      release preflight also requires the selected SHA's validation to be fresh.

    **Where:** [CI run 40564084962][main-ci-evidence],
    [Security run 40564085126][main-security-evidence] and
    [CodeQL run 40564085030][main-codeql-evidence] → successful push runs for the full SHA
    `4bec06b072acb3c1d74d5cef1d42921048e06727`.

- [x] **145.** Record that GitHub's default branch is already `main`, confirmed from
      repository metadata on 2026-10-27 after the baseline history and workflows reached it.

    **Where:** [GitHub settings][gh-settings] → General → Default branch → main.

- [x] **146.** Verify Vercel's Production Branch is `main` while keeping automatic
      production Git deployment and automatic domain assignment disabled.

    **Where:** [Vercel][vercel] → project → Settings → Git / Environments → Production
    branch tracking; confirm the committed vercel.json safeguards and disabled
    domain-assignment toggle.

- [x] **147.** Create or confirm the active `Production main` branch ruleset targeting
      the exact `main` branch; GitHub's default branch setting does not establish ruleset
      enforcement.

    **Where:** [GitHub rulesets][gh-rulesets] → New branch ruleset → Production main →
    target main → Active.

- [x] **148.** Configure the main ruleset to restrict deletion, block force pushes and
      provide no routine bypass actors or applications. Leave **Restrict creations** and
      **Restrict updates** off; with no bypass actors, restricting updates also prevents
      PR merges. Recheck this setting after the task 160 investigation.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → branch rules and bypass
    list.

- [x] **149.** Require a pull request before merging into `main` and require conversation
      resolution.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → Require a pull request
    before merging and Require conversation resolution.

- [x] **150.** Use zero required independent PR approvals for the documented
      solo-maintainer workflow while preserving deliberate owner review; revisit this if
      another maintainer joins.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → pull request rules →
    required approvals.

- [x] **151.** Require branches to be up to date and required status checks to pass before
      merging.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → required status checks →
    Require branches to be up to date before merging.

- [x] **152.** After the checks have genuinely run, require `CI / Required` and select
      GitHub Actions as the expected check source where supported.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → required status checks →
    add CI / Required and select its source.

- [x] **153.** Require `Security / Dependencies` and `Security / Secrets` as stable main
      checks.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → required status checks →
    add Security / Dependencies and Security / Secrets.

- [x] **154.** Require `Security / CodeQL JS` and `Security / CodeQL Actions` as stable
      main checks.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → required status checks →
    add Security / CodeQL JS and Security / CodeQL Actions.

- [x] **155.** Keep Preview, release and scheduled-only jobs outside the main
      required-check set; retain the aggregate correctness gate. Do not require the
      `Vercel` status, `Preview / Smoke` or `Preview / Acceptance`, and leave **Require
      deployments to succeed before merging** off. Dependabot and other PRs must still
      pass all five CI/security checks listed in items 152–154.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → review the complete
    required status-check list.

- [x] **156.** If available, configure the ruleset's required CodeQL scanning results to
      block error and high/critical security findings.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → Require code scanning
    results → CodeQL and severity thresholds, if available.

- [x] **157.** Use a disposable PR to prove a failing check blocks merging, an obsolete PR
      run is cancelled and a newer main commit makes the PR out of date.

    **Where:** [GitHub pull requests][gh-prs] → disposable PR → merge status and Checks;
    [GitHub Actions][gh-actions] → obsolete-run cancellation evidence.

- [x] **158.** Retain evidence that the configured main protections reject direct feature
      pushes, force pushes and deletion without risking production history.

    **Where:** [GitHub rulesets][gh-rulesets] → Production main → rule details / insights;
    use an isolated rehearsal repository if a destructive attempt is needed to demonstrate
    rejection.

- [x] **159.** Confirm newer pushes do not cancel required validation of already merged
      main commits.

    **Where:** [GitHub Actions][gh-actions] → successive push-to-main runs → confirm earlier
    required runs continue rather than being cancelled.

- [ ] **160.** Validate one real Dependabot package-update PR against pnpm 12: confirm the
      manifest, lockfile, overrides, lifecycle policy and release-age protections remain
      correct. Require the same CI/security validation as other PRs without requiring a
      Vercel deployment. Keep this item open until the selected PR passes those checks.

    Investigation on 2026-10-28: [PR #8](https://github.com/gonzalopozo/my-portfolio/pull/8)
    passed its frozen pnpm 12 installation and Vercel reported a successful deployment.
    Its [Preview run](https://github.com/gonzalopozo/my-portfolio/actions/runs/40687554739)
    failed before any steps because the `preview-checks` environment rejected the
    Dependabot branch. The environment evaluates the workflow ref, even when checkout
    specifies `main`. The updated smoke condition skips branch-triggered runs; retain
    the main-only environment policy. If hosted smoke evidence is needed, dispatch
    **Preview checks** from **main** with the reviewed Preview deployment ID and
    **acceptance** false. No Preview deployment means no hosted smoke evidence; the
    secret-free production E2E gate remains required.

    Separately, PR #8's [CI / Quality run](https://github.com/gonzalopozo/my-portfolio/actions/runs/40686963249/job/122811696575)
    reported Prettier differences in `AGENTS-PATTERNS-REFERENCE.md`,
    `components/public/portfolio-grid-layout.ts`, `lib/og-image-feedback.ts` and
    `lib/types.d.ts`. Resolve these in the dependency PR and rerun CI; fixing Preview
    alone does not make the PR ready. The active `Production main` ruleset also showed
    **Restrict updates** enabled with no bypass actors, an empty required-status-check
    list, and the up-to-date requirement disabled. Correct those dashboard settings
    using items 148 and 151–155; do not add a bot bypass or merge with failed CI.

    **Where:** [GitHub pull requests][gh-prs] → real Dependabot PR → Files changed and
    Checks; inspect package.json, pnpm-lock.yaml and pnpm policy changes. [GitHub
    rulesets][gh-rulesets] → Production main → branch restrictions and required status
    checks; [GitHub environments][gh-environments] → preview-checks → Deployment branches
    and tags → retain main only. For optional hosted smoke, [GitHub Preview
    checks][gh-preview] → Run workflow → main → deployment_id, acceptance false. Merge
    the workflow repair through a reviewed PR, then update the dependency branch to the
    latest main before relying on its updated condition.

- [x] **161.** If Dependabot cannot generate the pnpm 12 lockfile, document that
      limitation, retain alerts and Actions updates, stop manifest-only update PRs and use
      reviewed manual dependency PRs.

    **Where:** [GitHub pull requests][gh-prs] → Dependabot update errors / PRs; local editor
    → Dependabot configuration and limitation notes; submit reviewed manual dependency PRs.

- [x] **162.** Confirm weekly dependency/Actions update groups match the configuration and
      security updates receive timely owner review without automatic merge exemptions.

    **Where:** [GitHub repository][gh-repo] →
    [.github/dependabot.yml](../../.github/dependabot.yml); [GitHub pull requests][gh-prs] →
    grouped update PRs and security-update review.

- [x] **163.** Agree on the urgent-patch path: a focused PR, a reviewed version-specific
      release-age exception only if needed, complete checks and an approved staged release.

    **Where:** Private operations notes and [GitHub pull requests][gh-prs] → urgent-patch
    review procedure; local editor for any narrowly scoped release-age exception.

- [x] **164.** Confirm no CI job automates `pnpm audit --fix` against a protected branch.

    **Where:** [GitHub repository][gh-repo] → .github/workflows and package scripts,
    reviewed in the editor or GitHub code view.

- [x] **165.** Dispatch the Service contracts workflow from trusted `main` with only the
      protected nonproduction environment credentials.

    **Where:** [GitHub Service contracts][gh-contracts] → Run workflow → branch main.

    If `pnpm tsx scripts/contracts.mts` reports `Missing configuration:
TURSO_NONPRODUCTION_ORG`, the value did not reach the script; Turso has not yet
    been contacted. Confirm the setting exists in the `service-contracts` GitHub
    environment. Older workflow revisions read only Variables; settings stored as
    Secrets need the workflow revision that accepts both. Merge that repair into
    `main`, then dispatch a new run from `main`. Check all four settings from items
    061–062, since the same scope mismatch also affects the group and Blob origins.

- [x] **166.** Confirm the contract run creates a fresh empty owned `ci-<run>-<suffix>`
      Turso database in the intended nonproduction group.

    **Where:** [GitHub Service contracts][gh-contracts] → Services / Contracts →
    resource-creation logs; [Turso][turso] → nonproduction organization / group.

- [x] **167.** Confirm the protected workflow's `pnpm test:contract` passes real Turso
      transaction rollback, foreign-key constraints, conditional writes and
      migration/timestamp behavior.

    **Where:** [GitHub Service contracts][gh-contracts] → Services / Contracts → remote
    Turso contract results.

- [x] **168.** Confirm the Blob contract verifies token/store identity before uploading
      and can read and delete only its owned synthetic `ci/<run>/<uuid>` object.

    **Where:** [GitHub Service contracts][gh-contracts] → Services / Contracts → Blob
    identity / object contract results; [Vercel][vercel] → nonproduction Blob store.

- [x] **169.** Confirm successful and failed contract runs clean up their owned database
      and synthetic Blob objects.

    **Where:** [GitHub Service contracts][gh-contracts] → contract and cleanup logs;
    [Turso][turso] → owned database state; [Vercel][vercel] → Storage → owned object state.

- [x] **170.** Review the interrupted-run cleanup path: it must match the recorded
      resource ID/name/organization/group and never delete an entire group or store.

    **Where:** [GitHub Service contracts][gh-contracts] → interrupted run and cleanup
    records; local editor → cleanup ownership guards; inspect only matching resources in
    Turso / Vercel.

- [x] **171.** Record owner reconciliation steps for resources created before an
      interruption prevented an ownership record from being written.

    **Where:** Private operations notes, using [GitHub Actions][gh-actions] run IDs and the
    matching [Turso][turso] / [Vercel][vercel] resource records.

- [x] **172.** Create a reviewed protected Preview acceptance deployment using only the
      isolated synthetic database, store and administrator.

    **Where:** [GitHub pull requests][gh-prs] → reviewed feature branch; [Vercel][vercel] →
    project → Deployments → its protected Preview deployment and configuration.

- [x] **173.** Inspect Preview build logs to confirm Node 24, the pinned pnpm bootstrap,
      frozen installation and build-cache bypass are actually used.

    **Where:** [Vercel][vercel] → project → Deployments → Preview deployment → Build Logs.

- [x] **174.** Confirm hosted runtime settings do not activate local
      filesystem/network/query fixtures.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables and Preview
    runtime logs; local editor → hosted fixture guards.

- [x] **175.** Run Preview smoke validation and confirm deployment metadata proves the
      intended project, repository, source SHA, age, readiness state and exact HTTPS origin.

    **Where:** [GitHub Preview checks][gh-preview] → Run workflow → main → verified
    deployment_id, acceptance false; inspect Preview / Smoke results.

- [x] **176.** Confirm the browser bypass bootstrap is restricted to that verified origin,
      refuses redirects and never forwards bypass headers globally to third parties.

    **Where:** [GitHub Preview checks][gh-preview] → Preview / Acceptance results when
    dispatched; [GitHub repository][gh-repo] → browser bypass bootstrap configuration for
    origin / redirect guards.

- [x] **177.** Dispatch Preview acceptance from trusted `main` with the synthetic Preview
      administrator. Confirm the separate system-dependency and browser installation steps
      complete within their eight- and five-minute limits before the acceptance suite runs.

    **Where:** [GitHub Preview checks][gh-preview] → Run workflow → main → deployment_id →
    acceptance true; approve the preview-acceptance environment through Review deployments.

- [x] **178.** Confirm hosted CSP enforcement, nonce freshness, public hydration,
      forged-session handling and real login/logout pass in Preview. Retain the
      parser-inserted blocked-script probe and matching nonced control as hosted evidence.

    **Where:** [GitHub Preview checks][gh-preview] → run → Preview / Acceptance → hosted CSP
    and authentication results.

- [x] **179.** Confirm Preview acceptance retains no authenticated traces, screenshots or
      browser storage-state artifacts.

    **Where:** [GitHub Preview checks][gh-preview] → run → Artifacts / job logs; [GitHub
    repository][gh-repo] → remote recording configuration.

- [x] **180.** Confirm the hosted public document/CDN caching behavior and private admin
      caching remain appropriate after CSP is enabled. Public card HTML must remain readable
      before hydration and fresh after controlled synthetic CMS content/icon changes;
      verify both route HTML and data invalidation without disabling legitimate runtime
      caching. Private administrative responses must remain private and uncached.

    **Where:** The protected Preview site → browser Developer Tools → Network → document /
    response cache headers and returned HTML before/after a synthetic CMS change;
    [Vercel][vercel] → runtime logs and deployment details.

- [x] **181.** After successful protected Preview acceptance, configure Production
      `CSP_PUBLIC_MODE=enforce`, `CSP_ADMIN_MODE=enforce` and `CSP_ADMIN_POLICY=nonce`.

    **Where:** [Vercel][vercel] → project → Settings → Environment Variables → Production →
    the three CSP settings.

- [x] **182.** Review any remaining differences between local fixtures, Preview and
      Production; record unresolved platform/API assumptions instead of treating local
      coverage as hosted proof.

    **Where:** Private operations notes, comparing [GitHub CI][gh-ci], [GitHub Preview
    checks][gh-preview] and the actual Vercel / Turso / Blob settings.

- [x] **183.** Before touching production schema, confirm its current ledger is an exact
      reviewed migration prefix and the live application remains compatible with the planned
      expansion.

    **Where:** [Turso][turso] → production database schema / ledger through the SQL console
    or Turso CLI; local editor → committed migration history and live-version compatibility.

    **Progress (2026-11-03):** The owner's initial metadata query found application
    tables without `__drizzle_migrations`. The successful
    [baseline run](https://github.com/gonzalopozo/my-portfolio/actions/runs/41641299002)
    subsequently confirmed the exact `0005_custom_skill_icon` schema and recorded
    its migration history. Migration 0006 remains pending and adds only a new table
    and index, as reviewed in items 193 and 196. Keep this item open until the owner
    confirms the currently live application's compatibility with that expansion.

- [x] **184.** If the production ledger is missing, reconstruct the candidate historical
      migration prefix in a disposable reference database and compare its schema exactly.

    **Where:** Local terminal → reconstruct the historical prefix in a disposable reference
    database and compare it with production through the documented migration tooling.

    **Evidence (2026-11-03):** The protected
    [Release / Baseline job](https://github.com/gonzalopozo/my-portfolio/actions/runs/41641299002/job/125935209097)
    succeeded at `pnpm migrate:baseline` for main SHA
    `a764ddf0343a9040445b6f747b3243eb66c15ea5`. The tool reconstructed migrations
    0000–0005 in a disposable in-memory database and compared its normalized schema
    definitions exactly with production before writing migration history. This
    comparison ran in GitHub Actions; no separate local comparison was run.

- [x] **185.** If production schema differs from that reference, stop the baseline and
      prepare a reviewed drift-reconciliation or restore procedure.

    **Where:** Private operations notes and [GitHub pull requests][gh-prs] → review the
    reconciliation / restore plan; inspect the mismatch in Turso without forcing the
    baseline.

    **Not applicable (2026-11-03):** Item 184's exact comparison succeeded. The
    inspected production schema matched the reference, so no drift reconciliation
    was required for this baseline. Future schema differences still block release.

- [x] **186.** If a baseline is required, identify the exact matching `baseline_tag`; use
      `0005_custom_skill_icon` only when the actual schema matches that prefix.

    **Where:** Local editor → committed migration journal and SQL; local terminal → exact
    reference-schema comparison with the production database.

    **Evidence (2026-11-03):** The successful baseline job's configuration records
    `MIGRATION_BASELINE_TAG=0005_custom_skill_icon`. Its exact comparison confirmed
    the tag previously identified from the owner's schema definitions. The
    committed history through that tag contains six migrations.

- [x] **187.** If a baseline is required, obtain fresh successful validation of the exact
      current `main` SHA and record a confirmed recovery reference.

    **Where:** [GitHub Actions][gh-actions] → successful runs for current main;
    [Turso][turso] → production recovery availability; private notes for the nonsecret
    recovery reference.

    **Progress (2026-11-03):** The baseline job received a recovery reference and
    confirmed that its checkout matched the current main SHA. Its success alone
    does not prove fresh CI/security validation or the referenced recovery option's
    usability. Those requirements remain unverified here; the reference itself is
    retained privately rather than copied into this checklist.

- [x] **188.** If a baseline is required, dispatch Release from `main` with operation
      `baseline`, the full current SHA, the recovery reference and the verified baseline tag.

    **Where:** [GitHub Release][gh-release] → Run workflow → main → operation baseline →
    sha, recovery_point and baseline_tag.

    **Evidence (2026-11-03):** Owner-dispatched
    [Release run 41641299002](https://github.com/gonzalopozo/my-portfolio/actions/runs/41641299002)
    ran from main and completed successfully at 13:07 UTC. The baseline job used
    SHA `a764ddf0343a9040445b6f747b3243eb66c15ea5`, the supplied recovery reference
    and tag `0005_custom_skill_icon`. Recovery verification remains tracked
    separately in items 187, 191 and 192.

- [x] **189.** If a baseline is required, review and approve the `production-migrations`
      environment and confirm the tool writes only the verified ledger metadata.

    **Where:** [GitHub Release][gh-release] → baseline run → Review deployments →
    production-migrations; then inspect the baseline job's result and ledger metadata.

    **Evidence (2026-11-03):** GitHub approval history for run 41641299002 records
    owner `gonzalopozo` approving `production-migrations`. The protected baseline
    job succeeded. The verified baseline path writes only the migration-history
    table and its six entries after the exact comparison; it does not apply 0006
    or deploy an application candidate.

- [x] **190.** Confirm no baseline operation overwrote an existing ledger or blindly
      marked unknown SQL as applied.

    **Where:** [GitHub Release][gh-release] → baseline logs; [Turso][turso] → privately
    inspect the production migration ledger through its SQL console or the Turso CLI.

    **Evidence (2026-11-03):** The successful baseline job ran the guarded path that
    compares production with the reconstructed schema, refuses a populated ledger
    and commits only the matching migration-history entries. The owner's earlier
    metadata query confirmed the ledger was absent. No manual ledger insertion or
    bypass was used in this run; no additional direct production query was run by
    the agent.

- [x] **191.** Exercise database recovery with disposable synthetic resources and document
      restoration into a new database, application URL/token changes and possible data loss.

    **Where:** [Turso][turso] recovery controls or the Turso CLI → disposable synthetic
    database restore; private operations notes for new credentials, URL changes and
    data-loss implications.

- [x] **192.** Confirm the production recovery point or verified backup is available
      immediately before the first actual migration.

    **Where:** [Turso][turso] → production database recovery options, or private backup
    storage → verified recovery point; record its reference privately.

    **Progress (2026-11-03):** The owner reports an existing production backup dated
    **2026-10-20**, fourteen days before this review. Its restoration has not been
    verified in this work. Restoring it could omit changes made after that date.
    The baseline has now completed with a supplied recovery reference, but that
    input does not verify recoverability. Confirm a current verified backup or
    usable recovery point before further production operations, and retain its
    actual reference privately. Items 187, 191 and 192 remain open pending that
    evidence and the separate recovery drill.

    **Audit update (2026-11-05):** For the successful November 5 release, the owner
    confirmed having a backup/reference without having verified recovery. Reopen
    this item until the current recovery option's usability is confirmed and its
    evidence retained privately. A successful Release run does not verify backup
    restoration. Task 191 is a separate recovery exercise; its completion was not
    established by this release audit.

    **Owner update (2026-11-06):** Marked complete at the owner's request following
    backup-verification guidance. Restore results were not reviewed in this session;
    this closure does not establish verification before the November 5 release.

- [x] **193.** Review the pending `0006_auth_rate_limits` SQL, its snapshot/journal
      metadata, exact committed hash and `expand` classification before deploying code that
      uses persistent auth counters.

    **Where:** Local editor or [GitHub pull requests][gh-prs] → migration SQL, snapshot,
    journal and policy diff for 0006_auth_rate_limits.

    **Evidence (2026-11-03):** Read-only source review covered
    [SQL](../../db/migrations/0006_auth_rate_limits.sql),
    [snapshot](../../db/migrations/meta/0006_snapshot.json),
    [journal](../../db/migrations/meta/_journal.json) and
    [policy](../../db/migrations/policy.json). The SQL adds only `rate_limits` and
    its unique key index. The snapshot links to the preceding snapshot and includes
    that table/index; the journal records the matching tag. The policy classifies
    it as `expand` and records SHA-256
    `e51a532bdc4ebb31ef7a25530ff77223ff1417b78b95b7a4a1b5fd820ee5aa51`.
    The successful baseline job subsequently ran `migrationFiles`, which verifies
    the committed SQL hashes, including 0006. Production application of 0006
    remains pending; the baseline recorded only migrations 0000–0005.

- [x] **194.** Record the production release procedure: committed migrations only, no
      schema pushing or automatic migrations during startup or the Vercel build.

    **Where:** Private operations notes and repository release documentation in your editor;
    compare with [GitHub Release][gh-release] and Vercel build settings.

    **Evidence (2026-11-03):** The procedure is recorded in the
    [release runbook](./releases.md#normal-release) and
    [service guide](./services.md#turso-and-drizzle). The
    [Release workflow](../../.github/workflows/release.yml) applies committed SQL
    in its protected migration job before candidate creation. Source review found
    no migration invocation in application startup or the Vercel install/build
    scripts. The database tool restricts schema pushing to local file databases.
    This records the procedure and source review. The one-time baseline has now
    completed; application of pending production migration 0006 remains pending.

- [x] **195.** Confirm old SQL files and hashes remain immutable and every future
      migration appends a matching journal/policy entry.

    **Where:** Local editor / [GitHub pull requests][gh-prs] → committed SQL, journal and
    policy history; [GitHub CI][gh-ci] → CI / Migrations evidence.

    **Evidence (2026-11-03):** The immutable-history rule is documented in
    [CI/CD guide](../../AGENTS-CICD.md#database-and-storage) and the
    [service guide](./services.md#turso-and-drizzle). Git history review showed
    migration-control commit `1a8d0c8` added migration 0006, its snapshot and policy,
    and updated the journal without changing SQL files 0000–0005. The migration
    directory has no changes between that commit and the reviewed HEAD.
    [migrationFiles](../../scripts/database.mts) requires matching journal/policy
    lengths, sequential indexes, matching tags and matching SQL hashes; production
    application also compares existing ledger hashes with the committed history.
    Future migrations must append their SQL, snapshot, journal and policy entries.
    This is a source/history review; no local checks were run.

- [x] **196.** Confirm only compatible expand migrations enter the normal release;
      destructive schema changes and required columns without defaults need a separate
      reviewed maintenance plan.

    **Where:** [GitHub pull requests][gh-prs] → migration review and classification; private
    maintenance plan for any incompatible change.

    **Evidence (2026-11-03):** Source review of
    [applyMigrations](../../scripts/database.mts) confirmed that production rejects
    pending migrations not classified as `expand` and rejects the destructive or
    incompatible SQL patterns implemented by its guard. The current
    `0006_auth_rate_limits` change adds a new table/index without altering existing
    application tables. Human compatibility review remains required for future SQL;
    this source review does not establish a successful production migration.

- [x] **197.** Agree that a future schema contraction follows an expanded schema,
      compatible code, a reviewed resumable backfill and old/new compatibility evidence.

    **Where:** Private operations notes and future migration PR review in [GitHub][gh-prs] →
    expand, backfill, compatibility evidence and separately approved contraction.

- [x] **198.** Confirm all migration writers use the controlled process and nobody will
      launch a competing dashboard or CLI migration during a release.

    **Where:** Private operations procedure; [GitHub Release][gh-release] → the sole
    controlled production migration path; inventory any other Turso CLI / dashboard writers.

- [x] **199.** Identify the known previous live production deployment and keep its ID/SHA
      and compatibility evidence available before the first new candidate.

    **Where:** [Vercel][vercel] → project → Deployments → current live deployment details;
    [GitHub Release][gh-release] → previous successful evidence, if available; private
    notes.

- [x] **200.** If the previous live deployment lacks health endpoints or a successful
      GitHub release record, prepare the documented owner-approved Vercel dashboard rollback
      procedure for that first release.

    **Where:** [Vercel][vercel] → project → Deployments → historical known-good deployment /
    rollback options; private operations notes for owner approval and the first-release
    procedure.

- [x] **201.** Choose the reviewed exact current `main` commit to release and record its
      full 40-character SHA.

    **Where:** [GitHub repository][gh-repo] → main → latest reviewed commit → copy its full
    SHA; confirm it matches the reviewed merged PR.

- [x] **202.** Confirm successful push-to-main runs of `ci.yml`, `security.yml` and
      `codeql.yml` match that SHA and are less than 24 hours old.

    **Where:** [GitHub Actions][gh-actions] → CI, Security and CodeQL → successful push runs
    filtered to the selected main SHA and their timestamps.

- [x] **203.** Confirm the latest scheduled/manual validations for that SHA are also
      successful and no missing, pending, failed, cancelled or skipped gate is being treated
      as success.

    **Where:** [GitHub Actions][gh-actions] → scheduled/manual run histories and outcomes
    for the selected SHA.

- [x] **204.** If main validation is stale, rerun the matching GitHub push validations
      before dispatching the release.

    **Where:** [GitHub Actions][gh-actions] → the matching push-to-main run → Re-run jobs;
    repeat for each stale required workflow.

- [x] **205.** Confirm there are no open blocking high/critical/error code-scanning
      findings for the release.

    **Where:** [GitHub security][gh-security] → Code scanning → open alerts for the release
    branch / SHA.

**Release audit (2026-11-05):** The
[successful Release run 41998526122][release-audit-2026-11-05] ran from `main` for
SHA `0520c538b9236fa66f5926e48c87d0ee59161e2d` and finished at 09:24 UTC.
Preflight, service contracts, migrations, candidate creation and promotion all
succeeded. Baseline and rollback were correctly skipped for operation `release`.
The audit inspected GitHub job/step outcomes, timestamps, approvals, deployment
statuses, both evidence archives and the controller source at that exact SHA.
No local validation or production mutation was performed by the audit.

The candidate and promoted deployment are the same ID,
`dpl_8296mDndcvgfTuzT5upJShRiMMpY`. The recorded previous production ID is
`dpl_5V1A7JZjm9DwPFaNETtyXvZLfe93`. Artifact `candidate-41998526122` records
`candidate-verified` at 09:16:07 UTC and expires on 2026-11-12;
`release-41998526122` records `production-verified` at 09:24:02 UTC and expires on
2027-02-03. GitHub deployment record `7569854821` has a successful status dated
09:24:02 UTC. The public health endpoint also returned HTTP 200, that release SHA
and `no-store` during this audit; readiness without credentials returned HTTP 401.

| Tasks   | Audit result                                       | Evidence and limits                                                                                                                                                                                                                                                                                            |
| ------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 206     | Incomplete at audit; closed by owner on November 6 | Dispatch, main SHA and a recovery reference are confirmed. Recovery was unverified at the November 5 audit; later closure does not change that timing.                                                                                                                                                         |
| 207     | Confirmed                                          | Preflight succeeded. The reviewed controller checks current main, fresh successful CI/security runs, project/repository identity, production branch, disabled automatic domain assignment and reviewer configuration.                                                                                          |
| 208     | Confirmed                                          | Service contracts and cleanup succeeded by 09:00:45 UTC; production migrations started at 09:13:40 UTC.                                                                                                                                                                                                        |
| 209–210 | Confirmed                                          | The owner confirmed reviewing SQL, migration history and the recovery reference. GitHub recorded production-migrations approval by gonzalopozo; the migration guard verified the approved checkout and current main SHA. Backup usability remains a separate unresolved requirement.                           |
| 211     | Confirmed                                          | Production migration application succeeded with ledger/schema, transaction and foreign-key guards. The candidate's authenticated readiness probe also succeeded, requiring the expected migration hash and rate_limits columns. Reviewed migration 0006 adds a table/index without updating portfolio records. |
| 212     | Not applicable                                     | This run's candidate succeeded. This entry does not claim that a candidate-failure recovery drill occurred.                                                                                                                                                                                                    |
| 213–214 | Confirmed                                          | The owner confirmed both committed install/build script commands in the Vercel Build Logs. The successful candidate controller verified production target, Ready state, exact SHA, project/repository identity, age and deployment origin.                                                                     |
| 215     | Unconfirmed                                        | Controller guards confirmed the previous production target before promotion. The owner did not check or could not recall the public domain's health SHA while approval was pending; no direct observation of that interval was recorded.                                                                       |
| 216–218 | Confirmed                                          | Protected candidate smoke succeeded, enforcing uncached health identity, public/login/auth checks and authenticated database readiness. Reviewed readiness code returns only bounded status metadata; the audit also observed HTTP 401 without credentials on the promoted site.                               |
| 222     | Unconfirmed                                        | Production approval by gonzalopozo is recorded. The owner was unsure whether the candidate evidence and protected URL were reviewed before approving.                                                                                                                                                          |
| 223     | Confirmed                                          | Successful promotion passed the current-run environment-ID approval check, fresh main/CI/security validation, open-finding gate, candidate identity/age checks and previous-production guards after the approval wait.                                                                                         |
| 224–226 | Confirmed                                          | Both artifacts and the GitHub deployment payload name the same candidate ID. Promotion waits for the production target and canonical health SHA, runs full canonical smoke, then records success. The deployment status and final artifact confirm that sequence completed.                                    |
| 227     | Confirmed                                          | The controller's reset request succeeded, and the owner independently confirmed Auto-assign Custom Production Domains is currently disabled in Vercel.                                                                                                                                                         |

- [x] **206.** Dispatch Release from branch `main` with operation `release`, the exact
      full SHA and a nonsecret confirmed recovery-point or backup reference.

    **Where:** [GitHub Release][gh-release] → Run workflow → main → operation release → sha
    and recovery_point.

    **Owner update (2026-11-06):** Marked complete at the owner's request alongside
    item 192. The release succeeded, but the supplied recovery option was unverified
    at the November 5 audit. This closure does not establish that verification
    occurred before that release.

- [x] **207.** Review Release Preflight and confirm it verified current main, fresh
      validation, project/repository identity, the production branch, disabled domain
      assignment and configured reviewers.

    **Where:** [GitHub Release][gh-release] → selected run → Release / Preflight → logs and
    summary.

- [x] **208.** Confirm the release's protected service-contract dependency passes before
      any production migration begins.

    **Where:** [GitHub Release][gh-release] → selected run → called Service contracts job →
    results before Release / Migrations.

- [x] **209.** At Release Migrations, review SQL compatibility, ledger state,
      hashes/classifications and the recovery reference before approving the protected
      environment.

    **Where:** [GitHub Release][gh-release] → selected run → Review deployments →
    production-migrations; review the committed SQL and private recovery reference before
    Approve and deploy.

- [x] **210.** Confirm production migration approval was recorded for this workflow run
      and the migration checkout/current SHA still match the approved release.

    **Where:** [GitHub Release][gh-release] → selected run → approval history and Release /
    Migrations checkout / guard logs.

- [x] **211.** Confirm the migration completed in a transaction, preserved data and
      applied the persistent auth rate-limit table before the new app is exposed.

    **Where:** [GitHub Release][gh-release] → Release / Migrations → transaction and ledger
    results; [Turso][turso] → private schema / ledger inspection if needed.

- [x] **212.** If the candidate later fails, leave compatible additive SQL in place while
      the prior app remains live; repair the code through a new reviewed PR.

    **Where:** [GitHub Release][gh-release] → failed candidate evidence; [Vercel][vercel] →
    current live deployment; local editor and [GitHub pull requests][gh-prs] → the repair.

- [x] **213.** Confirm Vercel built a production-environment candidate from the exact
      approved Git SHA using the committed pnpm install/build commands.

    **Where:** [Vercel][vercel] → project → Deployments → candidate → source, target
    environment and Build Logs; [GitHub Release][gh-release] → candidate creation logs.

- [x] **214.** Confirm the candidate is Ready, belongs to the expected project/repository
      and has an acceptable age and exact verified deployment origin.

    **Where:** [Vercel][vercel] → candidate deployment details; [GitHub Release][gh-release]
    → candidate identity / readiness verification.

- [ ] **215.** Confirm the canonical production domain still serves the old deployment
      while candidate verification and human approval are pending.

    **Where:** [Vercel][vercel] → project → Domains / current production deployment;
    canonical production site → /api/health in your browser.

    **Remaining evidence:** On the next release, record the canonical health SHA
    while the production approval is pending and confirm it is the previous live
    release. The current site's new SHA cannot establish what was served during
    the November 5 approval wait.

- [x] **216.** Confirm candidate `/api/health` returns status `ok`, the expected release
      SHA and no-store cache headers.

    **Where:** [GitHub Release][gh-release] → candidate verification → /api/health probe
    result; inspect headers through your browser's Network panel if needed.

- [x] **217.** Confirm candidate public content, `/login` and `/api/auth/ok` pass the
      bounded smoke probes without CMS mutations.

    **Where:** [GitHub Release][gh-release] → candidate verification → public, login and
    authentication smoke results.

- [x] **218.** Confirm candidate `/api/ready` requires its separate Bearer token and
      reports the required database/schema/ledger state without exposing infrastructure
      details.

    **Where:** [GitHub Release][gh-release] → candidate verification → authenticated
    /api/ready result, using the protected job's secret handling.

- [ ] **222.** Review the candidate verification evidence and protected deployment URL at
      Release Promote before approving the `production` environment.

    **Where:** [GitHub Release][gh-release] → selected run → candidate evidence → Review
    deployments → production → Approve and deploy for Release / Promote. See the [GitHub
    approval steps][gh-approval-docs].

    **Remaining evidence:** The owner was unsure whether both reviews occurred
    before the November 5 approval. Review the candidate artifact and protected
    deployment URL before approving the next release, and record that review.
    An approval event by itself does not establish the review was performed.

- [x] **223.** Confirm the controller rechecks approval history, main SHA, fresh checks,
      open findings, candidate identity/age and previous live deployment after the approval
      wait.

    **Where:** [GitHub Release][gh-release] → Release / Promote → post-approval guard logs.

- [x] **224.** Confirm promotion uses the exact verified candidate deployment ID without
      rebuilding it.

    **Where:** [GitHub Release][gh-release] → promotion logs / retained evidence;
    [Vercel][vercel] → promoted deployment ID and build history.

- [x] **225.** Confirm the canonical domain converges to the promoted deployment ID and
      reports the approved release SHA.

    **Where:** [Vercel][vercel] → project → current deployment / Domains; canonical
    production site → /api/health → release SHA.

- [x] **226.** Confirm canonical public/authentication smoke checks pass and the GitHub
      deployment record is marked successful only afterward.

    **Where:** [GitHub Release][gh-release] → canonical smoke results and final job outcome;
    [GitHub deployments][gh-deployments] → successful production deployment record.

- [x] **227.** Confirm automatic production domain assignment is still disabled after
      promotion, including when the promotion API temporarily changes it.

    **Where:** [Vercel][vercel] → project → Settings → Environments → Production →
    Auto-assign Custom Production Domains; [GitHub Release][gh-release] → reset /
    verification logs.

- [ ] **228.** Retain the candidate/release evidence with deployment IDs, prior deployment
      ID, SHA, workflow run, timestamp and state, using the documented retention periods.

    **Where:** [GitHub Release][gh-release] → run summary and evidence artifacts; [GitHub
    deployments][gh-deployments] → deployment record; private operations notes for durable
    references.

- [ ] **229.** Watch the first promoted release's availability, application errors, action
      failures, operation durations and service usage before declaring it accepted.

    **Where:** [GitHub Release][gh-release] → canonical smoke results; [Vercel][vercel] →
    Runtime Logs / Observability; [Turso][turso] and Vercel Storage → usage.

- [ ] **231.** Inspect classified operation logs from controlled synthetic failures for
      credentials, request/response bodies, query strings, sessions, private records,
      raw exception text and SQL parameters; resolve any leakage before acceptance.

    **Where:** [Vercel][vercel] → isolated Preview / candidate → Runtime Logs; local
    editor → classified logging and database error sanitization.

- [ ] **242.** Confirm public `/api/health` provides separate liveness/deployment identity
      while readiness checks the required migration and allows later compatible expand
      migrations.

    **Where:** Canonical production site → /api/health in your browser; [GitHub
    Release][gh-release] → authenticated readiness probe evidence.

- [ ] **246.** Configure Turso and Blob quota/usage notifications and review Vercel
      timeout, memory, concurrency and compute-limit signals available on the current plan.

    **Where:** [Turso][turso] → organization usage / plan notifications; [Vercel][vercel] →
    Storage usage, team usage / notifications and project Observability.

- [ ] **247.** Confirm actual Vercel/Turso retention windows and record the evidence
      needed beyond short runtime-log retention.

    **Where:** [Vercel][vercel] and [Turso][turso] → current plan / retention settings;
    private operations notes for sanitized incident and release evidence.

- [ ] **250.** Record operation-duration baselines and the first release's IDs so future
      error/latency changes can be correlated with deployments. Record three cold and three
      warm public-page captures under the loading brief's original conditions: 10 megabits
      per second networking, 80 ms latency and 4× CPU slowdown. Compare JavaScript before map
      activation and full grid visibility with the recorded baseline, targeting at least
      50% reductions in both and CLS no higher than 0.1. Retain measured results and any
      unresolved limitation rather than inferring performance from a passing browser test.

    **Where:** Private operations notes with sanitized observations from [Vercel][vercel]
    Runtime Logs, deployment details and [GitHub Release][gh-release] evidence; the protected
    Preview site → browser Developer Tools → Network / Performance captures using
    [the public loading brief](../../agent-instructions/optimize-public-loading.md).

- [ ] **251.** Rehearse failure cases using disposable candidates/resources or an isolated
      controller rehearsal, keeping production content and protection settings intact.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → controller
    rehearsal; disposable Vercel / Turso / Blob resources; private operations notes for
    results.

- [ ] **252.** Demonstrate that missing reviewer configuration prevents release preflight
      and that missing recorded approval prevents promotion.

    **Where:** [GitHub][github] → isolated rehearsal repository → Settings → Environments
    and Actions → Release → preflight / approval guards.

- [ ] **253.** Demonstrate that a rejected production approval leaves the old deployment
      live.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → Release → Review
    deployments → Reject; [Vercel][vercel] → rehearsal project's canonical deployment.

- [ ] **254.** Demonstrate that changing main during the approval wait or using an expired
      candidate makes promotion fail.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → Release →
    promotion approval wait and changed-main / expired-candidate guard logs.

- [ ] **255.** Demonstrate that failed, skipped, cancelled, missing or stale CI/security
      results block candidate creation or promotion.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → CI / Security
    and Release → rejection results for failed, skipped, cancelled, absent or stale
    validation.

- [ ] **256.** Demonstrate that failed service contracts block production migration and
      candidate creation.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → Service
    contracts and Release → blocked migration / candidate jobs.

- [ ] **257.** Demonstrate that a missing/changed ledger, unknown drift or incompatible
      production SQL blocks migration safely.

    **Where:** [Turso][turso] → disposable synthetic database; [GitHub][github] → isolated
    rehearsal repository → Actions → Release → migration / ledger rejection results.

- [ ] **258.** Demonstrate that candidate build or candidate smoke failure prevents
      promotion.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → Release;
    [Vercel][vercel] → disposable candidate → build and smoke-failure results.

- [ ] **259.** Demonstrate that a failed canonical smoke check produces a failed release
      status and retained evidence rather than a successful deployment record.

    **Where:** [GitHub][github] → isolated rehearsal repository → Actions → Release →
    canonical smoke failure, failed deployment record and retained evidence.

- [ ] **260.** Document the response to failure to restore disabled automatic domain
      assignment: freeze production triggers, restore the setting and verify actual domains.

    **Where:** Private incident runbook; [Vercel][vercel] → project → Production environment
    / domain assignment and Domains; [GitHub Release][gh-release] → freeze further
    dispatches.

- [ ] **261.** Document runner-interruption recovery: inspect migration ledger, deployment
      state and owned resources before retrying.

    **Where:** Private incident runbook using [GitHub Actions][gh-actions] → interrupted
    run, [Turso][turso] → ledger / owned databases and [Vercel][vercel] → deployments /
    owned objects.

- [ ] **262.** Confirm production release concurrency does not automatically cancel an
      active migration/release and review pending dispatches so a newer queued run does not
      silently replace the intended one.

    **Where:** [GitHub Release][gh-release] → active and queued runs; [GitHub
    repository][gh-repo] → release.yml concurrency configuration.

- [ ] **263.** For the first-release bootstrap case, rehearse or confirm the documented
      owner dashboard recovery path while the historical deployment remains available.

    **Where:** [Vercel][vercel] → project → Deployments → historical known-good deployment
    and rollback action; private owner approval / rehearsal notes.

- [ ] **264.** Once successful release records exist, select a recorded previous
      known-good production deployment and verify it remains compatible with the expanded
      database.

    **Where:** [GitHub Release][gh-release] → previous successful release evidence;
    [Vercel][vercel] → matching deployment; [Turso][turso] → current compatible migration
    state.

- [ ] **265.** Dispatch the automated rollback from trusted `main` using operation
      `rollback`, that previous deployment ID and its full historical SHA.

    **Where:** [GitHub Release][gh-release] → Run workflow → main → operation rollback →
    deployment_id and its historical sha.

- [ ] **266.** Approve the protected `production` rollback environment after reviewing the
      recorded successful target and current deployment's previous-ID relationship.

    **Where:** [GitHub Release][gh-release] → rollback run → Review deployments → production
    → review evidence, then Approve and deploy.

- [ ] **267.** Confirm rollback restores the requested known-good deployment, resets
      automatic domain assignment to false and passes canonical public/authentication/health
      checks.

    **Where:** [GitHub Release][gh-release] → rollback / canonical smoke logs;
    [Vercel][vercel] → current deployment, Domains and disabled automatic domain assignment.

- [ ] **268.** Confirm application rollback did not reverse SQL migrations or imply that
      production data was restored.

    **Where:** [Turso][turso] → production ledger / schema through its SQL console or Turso
    CLI; [GitHub Release][gh-release] → rollback logs showing application-only recovery.

- [ ] **269.** Retain rollback evidence and document symptom, timing, release IDs,
      database state, recovery action and follow-up work.

    **Where:** [GitHub Release][gh-release] → rollback evidence and deployment record;
    private incident notes for symptoms, timing, database state and follow-up.

- [ ] **270.** Document a private owner-operated emergency dashboard recovery path for a
      GitHub/API outage and how to reconcile its release evidence afterward.

    **Where:** Private incident runbook, referencing [Vercel][vercel] → project →
    Deployments → owner-operated rollback and later GitHub evidence reconciliation.

- [ ] **271.** Schedule credential expiry/rotation review, weekly dependency/Actions
      review and urgent security-patch handling with an identified owner.

    **Where:** Your calendar / task manager and private credential inventory; [GitHub pull
    requests][gh-prs] / Security for dependency review; issuing-service dashboards for
    rotation.

- [ ] **272.** Record that future changes to required job names need a coordinated ruleset
      update; if a merge queue is introduced, add `merge_group` triggers to every required
      workflow first.

    **Where:** Repository runbooks / workflow files in your editor or [GitHub PRs][gh-prs];
    [GitHub rulesets][gh-rulesets] → coordinated required-check changes.

- [ ] **273.** After the branch transition is accepted, GitHub's default branch and
      Vercel's Production Branch are confirmed as `main`, and `restructure` is retired,
      open a focused cleanup PR removing its temporary CI/Security/CodeQL workflow triggers
      and deployment-disable entry. Retain the `main` production safeguard and shared Git
      history; update remaining development-branch assumptions in the runbooks.

    **Where:** Local editor → remove only transitional restructure entries; [GitHub pull
    requests][gh-prs] → focused cleanup PR → required Checks.

- [ ] **274.** Review the full operational definition of done with actual workflow runs,
      platform settings, migration/recovery evidence, Preview results, release records and
      runtime diagnostics.

    **Where:** This checklist and private evidence index; [GitHub Actions][gh-actions],
    [Vercel][vercel] and [Turso][turso] → the actual settings and results.

- [ ] **275.** Record any unresolved hosted limitations and their owner before marking the
      CI/CD rollout complete.

    **Where:** Private operations notes and the rollout checklist → unresolved limitations,
    evidence and named owner.

- [ ] **276.** Confirm source code, runbooks and agent instructions agree, including the
      standing local pre-commit policy and the distinction between implementation approval and
      a request to commit.

    **Where:** Local editor or [GitHub PRs][gh-prs] → source, docs/operations, AGENTS.md and
    related agent guides.

- [ ] **277.** Mark the rollout complete only after platform configuration, complete
      CI/browser/security validation, remote contracts, production migration/promotion,
      runtime diagnostics and an applicable recovery drill have recorded evidence.

    **Where:** This checklist / private evidence index, backed by the linked GitHub workflow
    runs, Vercel deployments, Turso recovery records and runtime-log observations.

[github]: https://github.com
[baseline-pr]: https://github.com/gonzalopozo/my-portfolio/pull/1
[baseline-merge]: https://github.com/gonzalopozo/my-portfolio/commit/45085d5ab17413b20506ae9b87de9c42e040f9f9
[reviewed-main]: https://github.com/gonzalopozo/my-portfolio/commit/4bec06b072acb3c1d74d5cef1d42921048e06727
[main-ci-evidence]: https://github.com/gonzalopozo/my-portfolio/actions/runs/40564084962
[main-security-evidence]: https://github.com/gonzalopozo/my-portfolio/actions/runs/40564085126
[main-codeql-evidence]: https://github.com/gonzalopozo/my-portfolio/actions/runs/40564085030
[release-audit-2026-11-05]: https://github.com/gonzalopozo/my-portfolio/actions/runs/41998526122
[gh-repo]: https://github.com/gonzalopozo/my-portfolio
[gh-settings]: https://github.com/gonzalopozo/my-portfolio/settings
[gh-actions-settings]: https://github.com/gonzalopozo/my-portfolio/settings/actions
[gh-environments]: https://github.com/gonzalopozo/my-portfolio/settings/environments
[gh-variables]: https://github.com/gonzalopozo/my-portfolio/settings/variables/actions
[gh-secrets]: https://github.com/gonzalopozo/my-portfolio/settings/secrets/actions
[gh-rulesets]: https://github.com/gonzalopozo/my-portfolio/settings/rules
[gh-security]: https://github.com/gonzalopozo/my-portfolio/security
[gh-prs]: https://github.com/gonzalopozo/my-portfolio/pulls
[gh-actions]: https://github.com/gonzalopozo/my-portfolio/actions
[gh-ci]: https://github.com/gonzalopozo/my-portfolio/actions/workflows/ci.yml
[gh-security-workflow]: https://github.com/gonzalopozo/my-portfolio/actions/workflows/security.yml
[gh-codeql]: https://github.com/gonzalopozo/my-portfolio/actions/workflows/codeql.yml
[gh-contracts]: https://github.com/gonzalopozo/my-portfolio/actions/workflows/services-contracts.yml
[gh-preview]: https://github.com/gonzalopozo/my-portfolio/actions/workflows/preview-checks.yml
[gh-release]: https://github.com/gonzalopozo/my-portfolio/actions/workflows/release.yml
[gh-deployments]: https://github.com/gonzalopozo/my-portfolio/deployments
[vercel]: https://vercel.com/dashboard
[vercel-tokens]: https://vercel.com/account/settings/tokens
[turso]: https://app.turso.tech
[lastfm]: https://www.last.fm/api/accounts
[spotify]: https://developer.spotify.com/dashboard
[vercel-staging]: https://vercel.com/docs/deployments/promoting-a-deployment
[vercel-bypass-docs]: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
[gh-approval-docs]: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
