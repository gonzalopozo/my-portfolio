# Testing reference

Read [testing rules](./AGENTS-TESTING.md) and the relevant skills first. These
examples do not authorize local checks; the root pre-commit policy remains intact.

## Actual entry points

| Pattern                                       | Source to follow                          |
| --------------------------------------------- | ----------------------------------------- |
| Vitest projects and V8 coverage               | `vitest.config.mts`                       |
| Real migrated DB setup and cleanup            | `tests/fixtures/database.ts`              |
| Real better-auth HTTP/session tests           | `tests/integration/auth.test.ts`          |
| Real CMS actions and public/private facades   | `tests/integration/cms.test.ts`           |
| SQL constraints, rollback and ledger behavior | `tests/integration/migrations.test.ts`    |
| Auth/DB/Blob boundary mocks                   | `tests/security/admin-operations.test.ts` |
| Image CAS/failure/cleanup mocks               | `tests/actions/project-images.test.ts`    |
| RTL interaction and generic errors            | `tests/components/login.test.tsx`         |
| Production HTTPS/build/start lifecycle        | `scripts/run-production-e2e.mts`          |
| Browser network isolation and bypass cookie   | `e2e/fixtures.ts`                         |
| Actual API status/cookie/CSRF behavior        | `e2e/api.spec.ts`                         |
| CMS, uploads, ordering, cache and streaming   | `e2e/cms.spec.ts`                         |
| Enforced CSP, nonces and login/logout         | `e2e/csp.spec.ts`                         |
| Responsive public behavior                    | `e2e/public-responsive.spec.ts`           |
| Automated WCAG checks                         | `e2e/public.spec.ts`                      |
| Real Turso/Blob service contract              | `tests/contract/services.test.ts`         |

## Unit boundaries

Mock the module boundary, not the function under test. `vi.mock` is hoisted; create
shared spy state with `vi.hoisted`. A mocked Next `redirect` should throw, preserving
its real control-flow semantics. Reset mocks between tests. Never swallow a redirect
inside a generic error catch. Action auth failures must occur before side effects.

React 19/Compiler clients use RTL with `userEvent` for interactions and explicit
Vitest imports. `tests/setup-component.ts` installs jest-dom and cleanup. Test
accessible feedback/pending/disabled behavior; do not snapshot generated class names.

## Real data tests

Use `temporaryDatabase()` and close the returned fixture in `afterEach`/`finally`.
The fixture applies all committed migrations and creates synthetic user/account
records with better-auth hashing; sign-up remains disabled in production config.
Use actual SQL constraints/triggers to test failed transactions. Check persisted
records and absence of cache invalidation after failed writes.

No database URLs/tokens are loaded from real `.env.local` for the production runner.
External tests use a separate Vitest config and protected main workflow, with owned
resources created/deleted by `scripts/contracts.mts`. Do not add remote tests to the
normal suite or put production credentials in Actions PR environments.

## E2E and auth

Import `test`/`expect` from `./fixtures`. The production runner seeds accounts, builds
once, starts Next in production, exposes local HTTPS and runs all projects. Dedicated
login flows use semantic labels. Auth storage state is not persisted as an artifact.
If adding reusable state later, use ignored paths, synthetic accounts and appropriate
per-worker/session isolation; never a real administrator's state.

Remote CSP acceptance requires an explicit API-verified Preview origin and synthetic
credentials. Bootstrap a bypass cookie against that exact origin with redirects
disabled. Never configure global `extraHTTPHeaders` with a bypass secret. Keep remote
traces, screenshots and video off. Missing required configuration is a failure.

## CI source of truth

The committed `.github/workflows/` files replace the former tutorial workflow YAML.
[Operations](./docs/operations/README.md) describes their triggers, check names,
permissions, release approval, manual settings, and recovery. Do not copy cached
build workflows or push-to-production examples from unrelated guides.
