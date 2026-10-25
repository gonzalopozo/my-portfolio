# AGENTS-SETUP.md

## CSP and administrator configuration

Configure server-only `ADMIN_USER_IDS` with comma-separated stable better-auth user
IDs before using the CMS. Missing or malformed configuration grants no administrator
access. Obtain IDs through trusted manual account provisioning, never through email
matching or automatic enrollment. Set this independently in Development, Preview,
and Production; never use a `NEXT_PUBLIC_` variable.

`CSP_PUBLIC_MODE` and `CSP_ADMIN_MODE` default to `report-only`. Set either to
`enforce` only after its protected Preview validation gates pass. `CSP_ADMIN_POLICY`
defaults to `static`; `nonce` is supported when `VERCEL_ENV` is `preview` or
`production`. Vercel supplies that environment value. Keep `static` for local
development, or explicitly set `VERCEL_ENV=preview` for a local production-mode
nonce validation server.

After the protected Preview acceptance gates pass, the production configuration is:

```env
CSP_PUBLIC_MODE=enforce
CSP_ADMIN_MODE=enforce
CSP_ADMIN_POLICY=nonce
```

Redeploy after changing these settings. Nonces apply only to administrative
documents; the public policy remains static to preserve public rendering/caching.
Restore `CSP_ADMIN_POLICY=static` and redeploy if administrative compatibility fails.

Hosted Vercel Preview derives its better-auth base URL from the validated
`VERCEL_URL` and automatically trusts that exact HTTPS origin. Enable access to
Vercel's System Environment Variables and leave Preview `BETTER_AUTH_URL` unset,
including branch-specific entries. Production and local development use their
configured `BETTER_AUTH_URL`; a local `APP_ENV=preview` run also uses that setting.

`BETTER_AUTH_TRUSTED_ORIGINS` can contain comma-separated additional exact HTTPS
aliases or HTTP local development origins such as `http://localhost:3000`.
Wildcard Vercel origins are not accepted. Keep Preview deployments access-protected
and use separate test data.

This setting contains website origins, not user IDs, tokens, or secrets. For local
development, use `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000` (adjust the port
to match the server). Include the scheme and omit paths, queries, and fragments.
Malformed entries stop authentication initialization with an error naming the
variable and entry number. Restart the development server after editing its env file.

See [security configuration and rollout](./AGENTS-SECURITY-REFERENCE.md) for policy
ownership, resource allowances, validation status, and rollback procedures.

First-time setup, environment configuration, and development prerequisites.

> **Before making schema changes or running Drizzle migrations, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/drizzle-orm/SKILL.md`

> **Before configuring Tailwind theme or CSS variables, execute the following skill** — read the SKILL.md and follow its instructions:
>
> 1. `.claude/skills/tailwind-design-system/SKILL.md`

---

## Prerequisites

- Node.js 24.x; `.nvmrc` follows the maintained major, including security patches.
- pnpm 12.14.0 via the repo's `packageManager` field; CI pins the same version.
- Turso CLI (optional, for local DB management)

## Environment Variables

Create a `.env.local` file:

```env
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
LASTFM_USERNAME=your-lastfm-username
LASTFM_API_KEY=your-lastfm-api-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

## Installation

```bash
pnpm i
pnpm run hooks:install
```

`ignoreScripts: true` is enabled in `pnpm-workspace.yaml`, so lifecycle scripts do not run during install. Husky hooks must be installed manually with `pnpm run hooks:install`.

## Making Schema Changes

1. Edit schema files in `db/schema/`
2. Generate and review a versioned migration with `pnpm migrate:generate`.
3. Classify the migration and commit its SQL hash in `db/migrations/policy.json`.
4. CI replays every supported migration prefix with `pnpm migrate:check`.
5. Production uses the protected Release workflow, never schema pushing.

`pnpm db:setup` and `pnpm migrate:push` support disposable local file databases only.
Commands in this guide do not override the root agent restriction on local checks.
See [operations setup](./docs/operations/README.md) for environment isolation and release ordering.

## Agent Skills Installation Policy

- Every new skill installed via `skills.sh` CLI must also be added to the `skills:install` script in `package.json`.
- Keep `skills:install` as the single source of truth for reproducible skill setup across environments.
