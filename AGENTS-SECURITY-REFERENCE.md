# AGENTS-SECURITY-REFERENCE.md

Full implementation code extracted from [AGENTS-SECURITY.md](./AGENTS-SECURITY.md). Read this file when actively implementing a security feature — the main file has the rules and decision guidance.

> **Skill directives apply here.** Follow the skill execution instructions at the top of [AGENTS-SECURITY.md](./AGENTS-SECURITY.md) before writing any code based on this reference.

---

## CSP Implementation and Configuration

Read the actual sources rather than copying a second policy implementation:
`lib/security/csp.ts`, `next.config.ts`, `proxy.ts`, and `app/(admin)/layout.tsx`.
Public layout rendering never reads request headers. Shared fonts/providers live in
`components/app-document.tsx`; `app/layout.tsx` is replaced by separate route roots.

| Setting                       | Default                  | Supported use                                          |
| ----------------------------- | ------------------------ | ------------------------------------------------------ |
| `CSP_PUBLIC_MODE`             | `report-only`            | `enforce` after public acceptance gates                |
| `CSP_ADMIN_MODE`              | `report-only`            | `enforce` after admin acceptance gates                 |
| `CSP_ADMIN_POLICY`            | `static`                 | `nonce` when `VERCEL_ENV` is `preview` or `production` |
| `ADMIN_USER_IDS`              | No privileges            | Comma-separated manually provisioned stable user IDs   |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Fixed production origins | Explicit development/Preview origin extensions         |

CSP modes in `next.config.ts` are build configuration. Redeploy/rebuild for a mode
change rather than assuming a runtime environment edit changes built header rules.
Keep proxy and layout environment settings identical within a deployment.

### Production policy inventory

| Directive                              | Public                                          | Administrative static / nonce                            |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `default-src`                          | `'self'`                                        | `'self'`                                                 |
| `script-src`                           | `'self' 'unsafe-inline'`                        | Static: same; nonce: `'self' 'nonce-…' 'strict-dynamic'` |
| `script-src-attr`                      | `'none'`                                        | `'none'`                                                 |
| `style-src`                            | `'self' 'unsafe-inline'`                        | Same; required for existing styles and Sonner            |
| `img-src`                              | `'self' data: blob:` and configured Blob origin | `'self' data:` and configured Blob origin                |
| `font-src`                             | `'self'`                                        | `'self'`                                                 |
| `connect-src`                          | `'self'` and exact Carto origins                | `'self'`                                                 |
| `worker-src`, `child-src`              | `'self' blob:`                                  | `'none'`                                                 |
| `media-src`, `frame-src`, `object-src` | `'none'`                                        | `'none'`                                                 |
| `base-uri`                             | `'none'`                                        | `'none'`                                                 |
| `form-action`                          | `'self'`                                        | `'self'`                                                 |
| `frame-ancestors`                      | `'none'`                                        | `'none'`                                                 |
| `upgrade-insecure-requests`            | Enforced (prod)                                 | Enforced (prod)                                          |

Carto origins: `basemaps.cartocdn.com`, `tiles.basemaps.cartocdn.com`, and
`tiles-a` through `tiles-d.basemaps.cartocdn.com`, all HTTPS. Stylesheet glyphs are
fetched map data governed by `connect-src`; ordinary page fonts are self-hosted.
`BLOB_PUBLIC_HOSTNAME` must be a single HTTPS `*.public.blob.vercel-storage.com`
store origin, without credentials, path, query, or fragment. No generic `https:`
allowance is used. The image optimizer's remote patterns remain independent.

Development adds script evaluation and WebSocket connections to localhost/127.0.0.1
only, and omits insecure-request upgrades. Other development hostnames must be
explicitly reviewed before adding their HMR origin. No production evaluation allowance.

`next.config.ts` owns public CSP; the admin proxy owns administrative CSP. General
security headers are separate and remain present during CSP rollback. APIs and
framework assets receive general headers, not a public document CSP.
Multiple enforced CSP headers intersect; they do not override one another. Inspect
Vercel/project/infrastructure configuration before adding or activating a header.

### Validation dependencies and eval reports

Application schemas import `z` from `@/lib/zod`, which calls
`z.config({ jitless: true })` before constructing schemas. The installed Zod
validator normally probes `Function` availability and can compile object parsers
at runtime. Even a caught probe triggers a browser CSP report. Schema modules can
reach admin client components through shared constants and file validation.

The configured import avoids that evaluation while retaining validation rules.
It disables runtime parser compilation on the server too. Keep the production
script policy free of `unsafe-eval`; investigate any remaining report using its
source file/line and distinguish application code from extensions or Preview tools.

### Nonce compatibility and limitations

The shared root's theme script prevented a route-local nonce integration without
public request dependencies. Separate roots share appearance/providers but establish
full-document transitions between policy sections. Login/logout explicitly load a
new document; the dashboard's public-site link is a native anchor.

Installed Next.js 16.2.6 `app-render.js` reads either enforced or report-only request
CSP, preferring enforced. The proxy explicitly forwards an enforced **request** CSP
for nonce extraction even when the **response** is report-only. This request header
does not enforce anything in the browser. `x-nonce` is overwritten with 32 random
bytes encoded as base64. Incoming policy/nonce headers cannot select the nonce.

The administrative root places its asynchronous document behind Suspense above
`html`/`body`. Installed `dynamic-rendering.js` explicitly permits this empty-shell
case. This is source-level feasibility evidence, **not proof of nonce injection or
browser compatibility**. Administrative nonces are supported in Preview and
Production. Continue validating nonce injection, streaming, and browser behavior
after framework changes, and retain the static fallback for compatibility failures.

---

## CSP Rollout and Verification

**Status reported by the project owner on 2026-10-13:** implementation verification,
protected report-only Preview, public/admin static enforcement, production static
activation, and enforced administrative nonce Preview validation are completed.
Detailed browser/cache captures are not recorded here. This promotion change permits
production nonces; its pre-commit verification and production nonce deployment/header
checks remain pending. Record automated check results separately; they do not satisfy
browser or deployment gates.

Follow `AGENTS.md`: checks, including formatting, lint, types, tests, and builds,
run only after the user requests a commit. The mandated pre-commit subagent performs
its full check sequence. Additional browser validation also requires authorization.
Commands below are a procedure, not a record of executed verification.

### 1. Audit and establish a production baseline

Use an authorized protected Preview of the pre-CSP revision with separate test data.
Record installed Next.js version, build route classification/prerender manifest,
public static/PPR shell eligibility, genuinely request-time work, cache lifetimes,
and the existing `updateTag`/`revalidatePath` behavior. Development observations do
not establish production behavior. Deployment-level security headers, WAF, and
Preview protection cannot be established through local source inspection.

Inspect public HTML, RSC/prefetch, authentication, dashboard, redirect, error/404,
image, and static-asset responses. Capture header names/values with secrets removed:
CSP, `Cache-Control`, `CDN-Cache-Control`, `Vercel-CDN-Cache-Control`, `Vary`, and
`x-vercel-cache`. Do not store Set-Cookie values or auth request bodies in evidence.
Never require every response to be a cache hit or a PPR final response to be cacheable.

### 2. Configure protected report-only Preview

Provision a dedicated test account and set its stable user ID in `ADMIN_USER_IDS`.
Use separate Preview database/Blob resources; do not test mutations against Production.
Configure the exact Preview origin in `BETTER_AUTH_TRUSTED_ORIGINS` and the appropriate
better-auth base URL. Keep Vercel Deployment Protection enabled.

Start with `CSP_PUBLIC_MODE=report-only`, `CSP_ADMIN_MODE=report-only`, and
`CSP_ADMIN_POLICY=static`. Collect browser console/network evidence and
`securitypolicyviolation` events, classified by route, directive, origin, browser,
disposition, and reproduction. Browser-extension violations are noise until reproduced
without extensions. Never whitelist an origin automatically.

Disable the Vercel Preview toolbar for the compatibility baseline or identify its
injected resources separately. A Preview-only toolbar violation does not justify
adding Vercel Live script origins to the production policy.

There is no `report-uri`, `report-to`, permanent collector, or third-party reporting
provider. Reporting API telemetry is unavailable; manual/browser evidence is the
supported initial workflow. Report-only frame restrictions may be ignored
by browsers; document expected diagnostics separately from application breakage.
Do not include script samples, credentials, full query strings, or private content.

### 3. Validate actual enforcement in isolated Preview

First enable public enforcement with static admin observation, then enforce static
administration. Evaluate administrative nonces separately with
`CSP_ADMIN_POLICY=nonce` and `CSP_ADMIN_MODE=enforce` on another protected Preview.
Vercel supplies `VERCEL_ENV=preview` for Preview and `production` for Production.
A local production-mode nonce validation server requires explicitly setting
`VERCEL_ENV=preview`.

After the commit request permits the build phase, the dedicated pre-commit agent
runs `pnpm build`. For authorized local production-mode browser validation, start
that build using `pnpm start`. Never use a development server as production evidence.
The validation build and runtime must use identical environment configuration.

The opt-in browser suite targets an existing server and does not start/build one:

```bash
pnpm exec playwright test --config playwright.csp.config.ts
```

Set `CSP_TEST_BASE_URL` in the execution environment to the authorized Preview URL
(or a local production-mode server). Optional `CSP_TEST_PREVIEW_BYPASS` must be a
protected automation credential supplied through the environment, never committed
or embedded in command text. Optional `CSP_TEST_ADMIN_EMAIL` and
`CSP_TEST_ADMIN_PASSWORD` identify the dedicated Preview administrator. Traces are
disabled for this suite; never commit authenticated browser storage states.
The suite is skipped unless an explicit target is provided. Tests with missing
credentials/enforcement are skipped and do not satisfy their acceptance gates.

Automated coverage includes policy/header separation, public interaction, nonce
freshness/script attributes, harmless inline injection behavior, forged-cookie
recovery, and login/logout. These tests have not run. Complete manual evidence for:

- Theme switching, map light/dark tiles and glyphs, fonts, optimized images, normalized
  SVG icons, responsive grid/dragging, reduced motion, Radix menus/dialogs, and toasts.
- Successful/failed login, expiry, logout, invalid cookies, and authenticated non-admins.
- Public → public, public → login, login → dashboard, dashboard → dashboard,
  dashboard → public, authenticated public → dashboard, reload, and back/forward.
  Verify actual document requests and active policy, not only destination URLs.
- Admin streaming/Suspense, direct nested routes, framework scripts/chunks, action
  responses, error recovery, prefetch, and nonce continuity within an existing document.
- CMS create/edit/delete/reorder, SVG upload/delete, OG refresh, and all validation errors.
  Use disposable data and clean up through authorized operations.
- Public plain text with harmless HTML-looking payloads, dangerous link protocols,
  normalized SVG rejection, and authorization denial before any protected read/write.

Under public inline-script allowance, an injected inline script may execute without
any violation. Zero reports are not proof of public XSS prevention.

### 4. Rendering, caching, and release gates

Compare the same revision/configurations using production-build evidence. Public
request dependencies must remain absent, cache functions/tags/lifetimes must remain
intact, and eligible public shells/HTML must retain their expected caching behavior.

Make a CMS change and confirm public content follows the existing immediate
`updateTag` invalidation semantics and dashboard `revalidatePath` refresh behavior.
Do not infer CDN or browser invalidation solely from a data-cache change. Distinguish
fully static HTML, PPR shells, dynamic final responses, and RSC cache keys.
Verify that dashboard/session data is absent from public artifacts/shared caches.
Private data leakage, missing authorization, blocked essential scripts, hydration
failure, or lost eligible public prerendering is a release blocker.

The static fallback can be activated after its own validation. After enforced nonce
Preview validation and the promotion commit checks pass, redeploy Production with:

```env
CSP_PUBLIC_MODE=enforce
CSP_ADMIN_MODE=enforce
CSP_ADMIN_POLICY=nonce
```

Keep public rendering/caching static. Inspect deployed public/admin document headers,
matching script nonces, login/logout, navigation, CMS operations, and revalidation.
If unproven or incompatible, retain static administration and document its inline-XSS
limitation. Never relax production evaluation or disable public Cache Components.

### 5. Rollback, monitoring, and maintenance

Redeploy with the affected mode set to `report-only`; leave the other policy,
allowlist, Origin checks, general headers, and public cache behavior intact.
For a failing nonce deployment, restore `CSP_ADMIN_POLICY=static` as well. No database
rollback is needed. Do not solve an admin failure by disabling the public policy.

After activation, inspect public and admin flows after deployment and after dependency
or origin changes. Keep browser evidence by revision/configuration. Review new scripts,
styles, analytics, images, and map providers before activation. Reassess inline-script
allowances when compatible framework capabilities change.

Continuous production reporting is not implemented. Consider a bounded collector
only as a separate operational requirement with ownership, body limits, validation,
WAF/rate limits, data minimization, retention, and flood handling.

---

## Administrator Provisioning and Enforcement

Retrieve the administrator's existing stable better-auth user ID through trusted,
manual administration. Configure `ADMIN_USER_IDS` separately in Development, Preview,
and Production. Never infer access from an email, all existing accounts, or client data.
Do not grant users automatically. Missing/malformed configuration grants no access;
an authenticated rejected user can sign out from the access-denied screen.

Use `requireAdmin()` before mutation validation/queries/files, `requireAdminPage()`
before protected page/query reads, and `getAdminSession()` for non-throwing page
states. Request-level memoization never places sessions into shared `use cache`
entries. Keep public projections separate from administrative data and session state.
Future protected HTTP data endpoints must use the same validated identity/allowlist
and adapt authentication failure to 401 or authorization failure to 403.

Ordinary auth/session-management endpoints remain public for sign-in/sign-out and
recovery, retaining better-auth or the existing explicit Origin check. The signed
session cookie cache's five-minute revocation tradeoff is unchanged. No step-up
authentication or audit-log infrastructure is introduced by this task; those measures
would require defined sensitive operations and do not neutralize active same-origin XSS.

---

## getServerSession Implementation

```typescript
// lib/server-session.ts
import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export const getServerSession = cache(async () => {
	return auth.api.getSession({
		headers: await headers(),
	});
});
```

---

## Rate Limiting Details

### Why Vercel WAF (Not In-Memory)

| Problem with in-memory | Impact                                                                      |
| ---------------------- | --------------------------------------------------------------------------- |
| Instance isolation     | Different serverless instances don't share counters — clients bypass limits |
| Cold starts            | Cache resets to zero on new instance                                        |
| No global view         | No cross-region coordination                                                |

Vercel WAF operates at the edge with global state. In-memory (`LRUCache`, `Map`) is fine for _data caching_, not for _rate limiting_ on serverless.

### Vercel WAF Setup (Dashboard)

1. Dashboard > Project > Firewall > Configure > + New Rule
2. Set **If** conditions (e.g., Request Path equals `/api/auth/*`)
3. Set **Then** action to Rate Limit
4. Configure Time Window and Request Limit
5. Select counting key: IP or JA4 Digest
6. Set exceeded action: Deny (429) or Challenge
7. Save > Review > Publish

### `@vercel/firewall` SDK

For rate limiting by application-level context (authenticated user ID, not just IP):

```typescript
import { checkRateLimit } from '@vercel/firewall';

export async function POST(request: Request) {
	const { rateLimited } = await checkRateLimit('api-mutation', {
		request,
	});

	if (rateLimited) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	// Continue with request handling
}
```

With authenticated user key:

```typescript
import { checkRateLimit } from '@vercel/firewall';
import { getServerSession } from '@/lib/server-session';

export async function POST(request: Request) {
	const session = await getServerSession();

	const { rateLimited } = await checkRateLimit('user-mutation', {
		request,
		rateLimitKey: session?.user.id ?? 'anonymous',
	});

	if (rateLimited) {
		return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	// Continue
}
```

> **Prerequisite:** The `@vercel/firewall` SDK requires a matching custom rule in the Vercel dashboard with the same Rate Limit ID.

### better-auth Rate Limiting Config

The implementation lives in `lib/auth-config.ts`: explicitly enabled database
storage, a global 10-second/100-request window, and better-auth's stricter built-in
endpoint rules. The plural Drizzle adapter maps `rateLimit` to `rateLimits`.
`0006_auth_rate_limits.sql` must be applied through the controlled migration flow
before the new application is exposed. Do not use memory counters across serverless
instances or copy stale default values from examples. Integration tests exercise
persistent limiting across independently initialized authentication instances.

### WAF Plan Limits

| Resource          | Hobby     | Pro        | Enterprise                          |
| ----------------- | --------- | ---------- | ----------------------------------- |
| Rate limit rules  | 1/project | 40/project | 1000/project                        |
| Counting keys     | IP, JA4   | IP, JA4    | IP, JA4, User Agent, custom headers |
| Time window range | 10s–10min | 10s–10min  | 10s–1hr                             |

---

## Cookie Flags (Set by better-auth)

| Flag       | Value               | Purpose                                                               |
| ---------- | ------------------- | --------------------------------------------------------------------- |
| `httpOnly` | `true`              | Not accessible via JavaScript — prevents XSS session theft            |
| `secure`   | `true` (production) | Only sent over HTTPS                                                  |
| `sameSite` | `lax`               | Sent on top-level navigations, blocked on cross-site form submissions |
| `path`     | `/`                 | Available on all routes                                               |

---

## Console Removal Config

```typescript
// next.config.ts
const nextConfig: NextConfig = {
	compiler: {
		removeConsole:
			process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
	},
};
```

Strips `console.log`, `console.debug`, `console.info`, `console.trace` from production builds; keeps `console.error` and `console.warn`.

---

## Dependency Audit Commands

```json
{
	"scripts": {
		"audit": "pnpm audit",
		"audit:fix": "pnpm audit --fix",
		"check-updates": "pnpm dlx npm-check-updates",
		"update:latest": "pnpm up --latest"
	}
}
```

| Command                      | When                       | What                                       |
| ---------------------------- | -------------------------- | ------------------------------------------ |
| `pnpm audit`                 | Before deployment, weekly  | Checks for known CVEs                      |
| `pnpm audit --fix`           | When vulnerabilities found | Adds overrides for non-vulnerable versions |
| `pnpm dlx npm-check-updates` | Monthly                    | Lists newer versions available             |
| `pnpm up --latest`           | After reviewing            | Updates all to latest (may break)          |
| `pnpm up`                    | Weekly                     | Updates within semver ranges (safe)        |

---

## Vercel Environment Variable Commands

```bash
pnpm dlx vercel env add TURSO_AUTH_TOKEN      # Add sensitive var (select scope + type)
pnpm dlx vercel env ls                         # List all env vars
pnpm dlx vercel env pull .env.local            # Pull for local development
```

### Vercel Auto-Provided Variables

| Variable                | Value                                    | Usage                                   |
| ----------------------- | ---------------------------------------- | --------------------------------------- |
| `VERCEL_URL`            | Deployment URL (no protocol)             | Construct `BETTER_AUTH_URL` dynamically |
| `VERCEL_ENV`            | `production` / `preview` / `development` | Conditional logic per environment       |
| `VERCEL_GIT_COMMIT_SHA` | Git commit hash                          | Cache busting, debugging                |

## CI/CD and observability

[Operations setup](./docs/operations/README.md) supersedes generic CI/deployment
examples. Existing firewall examples are optional references, not installed SDKs or
completed dashboard configuration. Hobby limits need confirmation before adding a
rule. Production migrations and releases use protected approval environments.
Audit fixes remain manual, reviewed dependency changes; never automate them on main.
Sentry privacy, source-map token scope, native/fallback secret scanning and credential
rotation procedures are documented in the operations guides.
