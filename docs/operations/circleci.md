# CircleCI setup — owner actions

Start with [the migration checklist](./ci-cd-todo.md). Repository files do not
create an account, install an app, configure contexts, change GitHub rules or
prove a release. Keep production dispatches frozen during setup; retain the live
Vercel deployment and its recovery option.

## Create the account

1. Open [CircleCI signup](https://circleci.com/signup/), choose email signup,
   verify the email and enable MFA. Create a `circleci` organization. Use this same
   login method later so a second account is not accidentally created.
2. Select **Free**. Do not enter a payment card, buy credits, enable automatic
   refills or upgrade the plan for this migration. The published allowance is
   30,000 credits/month and five active users. Open-source grants are optional;
   do not assume one has been awarded.
3. Select **Create Project**, connect GitHub Cloud and install the CircleCI GitHub
   App. On GitHub choose **Only select repositories → my-portfolio** under the
   `gonzalopozo` account. Do not grant access to unrelated repositories.
4. Use the committed configuration rather than a generated starter commit or the
   option that executes GitHub Actions YAML inside CircleCI.

See [account onboarding](https://circleci.com/docs/guides/getting-started/first-steps/),
[project creation](https://circleci.com/docs/guides/getting-started/create-project/)
and [current pricing](https://circleci.com/pricing/). Menu labels can change.

## Projects and triggers

The first migration PR needs this setup sequence:

1. Complete local setup and authorized verification, commit on the migration
   feature branch, then push that branch to GitHub. If it is already pushed,
   continue with project setup.
2. Configure Portfolio with `.circleci/config.yml` from the pushed branch for
   initial bootstrap. Keep normal PR validation following the event revision.
   Enable the combined PR/default-branch trigger described below.
3. Open a GitHub PR from that branch into main. This starts `pr-validation`;
   CCI-006 is the acceptance of those PR results. A feature-branch push by
   itself does not satisfy the configured PR workflow condition.
4. Once the PR checks pass, prepare restricted main contexts, switch the
   GitHub required checks and merge through the PR. Keep releases disabled.
5. Validate the actual merged SHA, then accept main-only CodeQL publication,
   service contracts and Preview webhooks. They do not have to run before
   opening this first PR.

Do not generate a starter commit or merge before CircleCI PR validation and
the coordinated ruleset switch. Prepare the separate Preview project now,
but activate its fixed-main webhook only after its config/controller reach
main (CCI-011). Follow the checklist phase headings; IDs stay fixed when
tasks move to their correct dependency phase.

Create these two projects in the same free organization. Keep automatic reruns
and automatic cancellation off during acceptance. Never cancel active production
operations to save credits.

- **Portfolio:** config `.circleci/config.yml` and checkout from the event
  revision; main for manual/scheduled operations. Use one GitHub App trigger:
  **PR opened or pushed to, default branch and tag pushes**.
- **Portfolio Preview:** config `.circleci/preview.yml` and checkout both fixed
  to main. Enable only the custom webhook; manual main runs are also supported.

In **Project Settings → Project Setup**, remove the default **All pushes** trigger
when adding the combined PR/default-branch trigger. This avoids duplicate push/PR
runs. The config ignores tags, PRs targeting other branches and non-main privileged
operations. External fork contributions are excluded: do not add OAuth fork
integration, fork imports, or secret forwarding. Same-repository Dependabot PRs
use normal validation.

Record both project IDs and pipeline definition IDs privately. For Portfolio,
copy **Project Settings → Overview → Project Slug** exactly into
`CIRCLECI_PROJECT_SLUG`. Its format is `circleci/<organization-id>/<project-id>`;
the identifiers are opaque and need not be UUIDs. Keep the copied value intact.
Record the owner's user UUID from `GET https://circleci.com/api/v2/me` as
`CIRCLECI_APPROVER_ID`. The [credential steps below](#copy-the-portfolio-project-slug)
explain where to find both values.

No account/project UUIDs are invented in configuration. Missing setup fails closed.
Both projects use the same pinned Node image; neither installs a browser.
See [GitHub App event options](https://circleci.com/docs/guides/orchestrate/github-trigger-event-options/).

## Credentials

Recreate tokens from the credential manager or issue narrowly scoped replacements.
GitHub does not expose existing Actions secrets for copying. Keep preview and
production Turso/Blob/auth resources isolated as described in [services](./services.md).
Do not put a production credential into Portfolio project-level variables.

For the first four metadata values, follow [CircleCI read token](#obtain-the-read-scoped-circleci-token),
[GitHub token](#obtain-the-metadata-github-token), [project slug](#copy-the-portfolio-project-slug)
and [owner user ID](#obtain-the-owner-approval-id) below.

Under **Organization Settings → Contexts**, create this matrix. When a job lists
multiple contexts in `.circleci/config.yml`, their variables are combined in that
YAML order; a later context supplies the value when variable names overlap.
The order you create contexts in CircleCI does not matter.

- **ci-metadata:** `CIRCLECI_READ_TOKEN`, read-only `GITHUB_TOKEN`,
  `CIRCLECI_PROJECT_SLUG`, `CIRCLECI_APPROVER_ID`, `CIRCLECI_RELEASES_ENABLED=false`,
  `GITHUB_REPOSITORY=gonzalopozo/my-portfolio`, `GITHUB_REPOSITORY_ID=571040276`,
  `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`, canonical `PRODUCTION_ORIGIN`.
- **codeql-publication:** `GITHUB_TOKEN` with Contents read and Code scanning
  alerts write for this repository.
- **release-credentials:** shared `VERCEL_TOKEN`, production
  `HEALTH_READINESS_TOKEN` and `GITHUB_TOKEN` with Contents read, Code scanning
  alerts read and Deployments write for this repository. Store these three
  credentials once in this context.
- **release-candidate:** only `VERCEL_AUTOMATION_BYPASS_SECRET`, using the
  separate release-candidate bypass value.
- **production-migrations:** production `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
  only; the metadata context supplies separate read-only validation access.
- **production:** only `VERCEL_AUTOMATION_BYPASS_SECRET`, using the separate
  production bypass value. No database credentials.
- **service-contracts:** nonproduction `TURSO_API_TOKEN`,
  `NONPRODUCTION_BLOB_TOKEN`, `TURSO_NONPRODUCTION_ORG`,
  `TURSO_NONPRODUCTION_GROUP=ci-contracts`, `CONTRACT_BLOB_ORIGIN` and
  `PRODUCTION_BLOB_ORIGIN`.

Each release job combines metadata, shared release credentials and its own bypass
context, in this order:

| Jobs                     | Contexts, in YAML order                                 |
| ------------------------ | ------------------------------------------------------- |
| `preflight`, `candidate` | `[ci-metadata, release-credentials, release-candidate]` |
| `promote`, `rollback`    | `[ci-metadata, release-credentials, production]`        |

The `GITHUB_TOKEN` from `release-credentials` overrides the read-only metadata
token for these jobs. Each job receives only its explicitly listed contexts.

If you already populated both phase contexts with duplicate credentials:

1. Create `release-credentials`, apply the restrictions below and add the three
   shared variables there.
2. Publish the updated `.circleci/config.yml` with the context lists above through
   the normal feature-branch/PR process.
3. Remove `VERCEL_TOKEN`, `HEALTH_READINESS_TOKEN` and `GITHUB_TOKEN` from
   `release-candidate` and `production`, leaving each one's distinct bypass value.

Keep `CIRCLECI_RELEASES_ENABLED=false` during this setup. Once the updated config
is in use, the two bypass contexts need only their single variable.

The metadata GitHub token needs Contents read and Code scanning alerts read. The
shared release token additionally needs Deployments write. Keep GitHub PATs separate
where permissions differ, limit them to this repository and record their expiry.
Store the release PAT only in `release-credentials`.
Grant no Contents write, Actions write or Administration permission. Vercel tokens
must be restricted to the intended owner/project as current controls permit.

For **every context**, add Portfolio as its only allowed project, plus this
expression restriction:

```txt
pipeline.git.branch == "main" and not job.ssh.enabled and not (pipeline.config_source starts-with "api")
```

An API-triggered run using checked-in main configuration is different from an
API-supplied configuration override. The latter must remain denied. Never remove
restrictions to make a rehearsal pass. If the account cannot enforce these
boundaries, keep releases disabled and record the limitation.
See [contexts and restrictions](https://circleci.com/docs/guides/security/contexts/).

### Preserve the four automation bypass secrets

Keep the existing separate `VERCEL_AUTOMATION_BYPASS_SECRET` values for each
consumer. Migrate saved values that are still active, or replace them individually:

| Existing bypass secret | Destination                                                   |
| ---------------------- | ------------------------------------------------------------- |
| release-candidate      | CircleCI context `release-candidate`                          |
| production             | CircleCI context `production`                                 |
| preview-checks         | Portfolio Preview project → Environment Variables             |
| preview-acceptance     | Private local `.env.preview-acceptance` or credential manager |

Every destination uses the variable name `VERCEL_AUTOMATION_BYPASS_SECRET` with
its corresponding value. Hosted Preview browser acceptance is now local, so its
secret stays with the owner's local acceptance credentials.

Vercel supports multiple bypass secrets per project, allowing independent
revocation and rotation. Each valid secret still applies across that Vercel
project's deployments; naming one production or Preview does not restrict it to
that environment. See [Vercel's bypass secret documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

### Obtain the read-scoped CircleCI token

`CIRCLECI_READ_TOKEN` is the `access_token` returned by CircleCI's OAuth flow.
Follow the command blocks in its [registration and PKCE guide](https://circleci.com/docs/guides/toolkit/oauth-dynamic-client-registration/)
in your own local terminal, using these choices:

1. **Step 1 — Register:** set `client_name` to `portfolio-ci-metadata` and keep
   `http://127.0.0.1:9090/callback` as the callback. Save the returned `client_id`
   for future rotations. This client ID is not the token.
2. **Step 2 — Listener:** run the guide's Python listener in a second terminal;
   leave it running. Copy its verifier, challenge and state into the first terminal
   as instructed. The guide requires `curl` and `python3`; `jq` is optional.
3. **Step 3 — Authorize:** open the generated URL, log in with the owner account,
   select **Read** and allow access. Authorize the organization if an SSO org
   selector appears. Verify the callback state matches the original state.
4. **Step 4 — Exchange:** exchange the returned code immediately. From the JSON
   response, copy only the value of `access_token` into `ci-metadata` as
   `CIRCLECI_READ_TOKEN` and into the private credential manager. The authorization
   code, client ID and PKCE verifier are different values.
5. Rotate before the 90-day expiry. Reuse the client ID; a new authorization
   revokes its previous token, so update the context immediately. No refresh token
   is issued.

Perform the flow in an unrecorded local terminal. Keep the token out of repository
files, pipeline parameters, PR comments, logs and artifacts.

Do not use a manually created owner PAT for this variable: those carry write
permissions and could approve jobs. The metadata adapter also permits only GET
requests to CircleCI. It never invokes an approval endpoint.

### Obtain the metadata GitHub token

For the `GITHUB_TOKEN` inside `ci-metadata`:

1. Open **GitHub → profile picture → Settings → Developer settings → Personal
   access tokens → Fine-grained tokens → Generate new token**.
2. Name it `portfolio-ci-metadata`, choose an expiry and select `gonzalopozo` as
   the resource owner.
3. Under **Repository access**, choose **Only select repositories** and select
   `my-portfolio`.
4. Under **Repository permissions**, set **Contents: Read-only** and **Code scanning
   alerts: Read-only**. Metadata read access is included automatically. Leave
   other permissions unchanged.
5. Generate the token. Copy its value into the private credential manager and
   the `ci-metadata` context's `GITHUB_TOKEN` variable.

Create GitHub tokens for the other permission sets in the matrix above. Store the
shared release PAT in `release-credentials`; the release-candidate and production
contexts contain only their respective bypass secrets. CircleCI does not generate
this GitHub token automatically.
See [GitHub's token instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

### Copy the Portfolio project slug

Open **CircleCI → Projects → Portfolio → Project Settings → Overview** and copy
**Project Slug**. Set that complete value as `CIRCLECI_PROJECT_SLUG` in
`ci-metadata`. Choose the Portfolio project that runs `.circleci/config.yml`.
The Preview project has a different slug.

CircleCI also returns the exact `project_slug` in pipeline/workflow API responses.
See [finding the project slug](https://circleci.com/docs/guides/toolkit/api-developers-guide/#getting-started-with-the-api).

### Obtain the owner approval ID

After obtaining the owner's read token, run this locally. It prompts for the
token without displaying it and prints only the owner's CircleCI user ID:

```sh
python3 - <<'PY'
import getpass
import json
import urllib.request

token = getpass.getpass("CircleCI read token: ")
request = urllib.request.Request(
    "https://circleci.com/api/v2/me",
    headers={"Authorization": f"Bearer {token}"},
)
with urllib.request.urlopen(request, timeout=30) as response:
    print(json.load(response)["id"])
PY
```

Copy the printed UUID into `ci-metadata` as `CIRCLECI_APPROVER_ID`. This identifies
the account that must approve production holds; it is a user ID, not a token or
organization ID. See [the current-user API example](https://circleci.com/docs/guides/toolkit/api-developers-guide/#add-an-api-token).

### Preview project variables

Custom-webhook context restrictions have documented limitations, so Preview has
its own project and fixed-main configuration instead of sharing privileged
Portfolio project variables. In **Portfolio Preview → Project Settings →
Environment Variables**, set only:

- `GITHUB_REPOSITORY`, `GITHUB_REPOSITORY_ID`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID`.
- `GITHUB_TOKEN` with Contents read for this repository.
- `VERCEL_TOKEN` and `VERCEL_AUTOMATION_BYPASS_SECRET` for verified Preview probes.

Use the existing preview-checks bypass secret here, following the
[four-secret mapping](#preserve-the-four-automation-bypass-secrets).

Do not add production Turso/readiness tokens or Preview administrator credentials.
Do not enable other VCS triggers or allow webhook data to select configuration,
checkout refs, shell commands, URLs or credentials. Only an owner may initiate
manual runs. Always choose main for both config and checkout refs.

## Automatic Preview smoke

1. After the migration reaches main, open **Portfolio Preview → Project Settings
   → Project Setup → Custom webhook +**. Set its branch to main and save.
2. Copy its generated endpoint URL including the secret to private storage. In
   **GitHub → repository Settings → Webhooks → Add webhook**, use that complete
   URL as Payload URL, select `application/json`, retain SSL verification and
   select only **Deployment statuses**. Keep the webhook active.
3. Redeliver the initial ping and an actual successful Vercel Preview event.
   Ping, pending/failure statuses and production deployments should halt before
   dependency installation. Inspect GitHub Recent Deliveries and CircleCI jobs.
4. Verify a successful event resolves the deployment through the Vercel API,
   checks repository/project/SHA/age and confirms its SHA is a current branch head
   in this repository before sending bypass credentials to its exact origin.
   Fork-only and superseded branch deployments are ineligible.
5. A manual Preview run takes `deployment_id=dpl_...`. Use the Preview project's
   checked-in main config and checkout. Browser acceptance remains a separate
   [local operation](./testing.md#hosted-preview-acceptance).

The webhook URL is a credential. Do not paste it into this guide or public job
logs. Treat payload strings as data; the controller does not execute PR artifacts
or source with these credentials. See [custom webhooks](https://circleci.com/docs/guides/orchestrate/custom-webhooks/).

## Validation, schedules and cost

The seven required jobs are `quality`, `tests`, `migrations`, `build`,
`dependencies`, `secrets` and `codeql`. The first runs must establish their actual
GitHub check names and source before configuring [the ruleset](./github.md).
CircleCI checks appear after PRs/pushes independently of local hook verification.

The quality job runs existing formatting/lint/type/spelling/unused-code/boundary
gates. Tests include coverage and JUnit reporting. The build job uses a migrated
synthetic local database and production HTTP/HTTPS smoke probes, with no browser.
Isolated production builds explicitly use one Next.js page-data/static-generation
worker, including the builds for local browser hooks. The harness uses an
allowlisted environment, so Next.js cannot rely on CircleCI metadata to size its
workers; host CPU discovery can otherwise exceed the container's memory budget.
CodeQL publishes only from trusted main; PR analysis uses no publication token.
The full audit replaces the dependency-review Action at the same high threshold.

Before downloading CodeQL, publication verifies the workflow, project and checkout
against CircleCI metadata. GitHub App runs provide source identity through
`trigger_parameters.git`, including `branch`, `ref`, `checkout_sha` and
`checkout_url`; they can omit the legacy `vcs` object. The exact repository's
HTTPS URL or SSH clone address is accepted. Release validation reads the same
commit metadata and requires a GitHub App `push` event for merged validation.
See [CircleCI's source metadata formats](https://circleci.com/docs/reference/outbound-webhooks-reference/#trigger-parameters).

An authentication error such as `circleci operation failed (401)` requires checking
the read token. A source-identity error lists the failed field names without
printing response bodies or credentials. Correct that mismatch before rerunning;
changing a token cannot fix source metadata parsing.

After successful merged-main validation, add two **schedule triggers** under
Project Setup, branch main, with pipeline parameters:

- Dependencies and secrets: daily around 06:17 UTC, with `task=security`.
- JavaScript/TypeScript CodeQL: Monday around 05:43 UTC, with `task=codeql`.

Use the closest supported scheduling window and record its actual setting;
CircleCI can delay scheduled starts. Use schedule triggers, not legacy cron
workflows for the GitHub App. [Schedule documentation](https://circleci.com/docs/guides/orchestrate/scheduled-pipelines/).

Use `task=contracts` for protected service contracts. Manual `task=validate` on
main supplements validation, but cannot replace the original main-push proof.
To refresh stale push proof, **rerun the entire original main-validation workflow** for
the unchanged current main commit; reused jobs older than 24 hours are rejected.
A new failed/pending manual or scheduled scan
blocks release until fresh successful validation supersedes it.

Keep `medium` as the default and `large` for CodeQL. There are no dependency,
Docker layer, browser or build caches. Review Usage after the first PR/main pair
and first scheduled scans; project monthly compute and storage from actual usage.
Do not enable paid features or reruns that hide flaky failures to stay green.

If the build prints `Killed` and exits with code 137 after compilation/type checking,
inspect the job's Resources memory graph for an out-of-memory kill. Confirm the
run includes the isolated-build worker limit before considering a larger executor.
The expected Next.js warning about a missing build cache does not establish the
cause of that failure. Retain the worker count, peak memory and SHA with the run
evidence. See [CircleCI's exit-137 guidance](https://support.circleci.com/en/articles/15090919-exit-code-137-out-of-memory).

## Production activation and evidence

Keep `CIRCLECI_RELEASES_ENABLED=false` until credentials, restrictions, source
identity, tests, approvals and recovery have been reviewed. The owner deliberately
sets it to true for controlled activation. A manually triggered pipeline is not
human approval. Releases use **approve-release-migrations** and
**approve-release-production**; baseline and rollback use
**approve-baseline-migrations** and **approve-rollback-production**, respectively.
Each distinct hold is checked against the owner UUID in the current workflow.

Release, rollback and baseline job groups share `portfolio-production` across all
steps and holds. Do not release the serial lock manually or cancel an active
migration. Older queued work can be skipped by serial ordering or expire after
the queue limit; neither is success. Start a new reviewed run when appropriate.
[Serial job-group documentation](https://circleci.com/docs/guides/orchestrate/controlling-serial-execution-across-your-organization/).

Set **Plan → Usage Controls** artifact retention to three days and workspace
retention to one day. Only coverage, SARIF, sanitized identity evidence and
minimal JSON handoffs are uploaded. Never upload the whole `.ci` directory.
CircleCI artifacts have a 30-day maximum, so export required nonsensitive release
records to private operations storage for at least 90 days. Candidate/production
GitHub Deployment records retain CI IDs, approval identity, deployment IDs and
success/failure state independently of ephemeral CircleCI artifacts.
[Artifact retention](https://circleci.com/docs/guides/optimize/artifacts/).

Finally follow the [release/rollback runbook](./releases.md). Keep old GitHub
Actions credentials until cutover/recovery evidence is recorded, then remove
obsolete credentials without deleting historical deployment records.
