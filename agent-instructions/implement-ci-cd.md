# Implement CI/CD

## Objective

Implement the approved CI/CD architecture for the existing portfolio and CMS,
using GitHub Actions for validation and Vercel Hobby for managed deployments.

## Context

The owner approved Node.js 24, pnpm 12, GitHub Flow with `main` as the production
branch, isolated test resources, comprehensive application tests, and a staged
Vercel release with explicit human approval. The repository currently defaults to
`restructure`; the owner must perform the documented branch transition.

## Required behavior

- Preserve existing architecture, tests, tooling, runtime caching, and conventions.
- Validate pull requests and the merged `main` commit with stable required checks.
- Build and test in production mode against isolated, synthetic local data.
- Use reviewed migrations, never production schema pushing or startup migrations.
- Release an immutable Vercel deployment only after checks, candidate smoke tests,
  and protected environment approval. Never expose production secrets to PR code.
- Add privacy-conscious observability, health probes, and operational runbooks.
- Keep repository implementation separate from owner-managed platform settings.

## Constraints

Use pnpm only. No Docker, alternative hosting, build caches, dependency download
caches, automatic audit fixes, commits, pushes, or platform mutations. Ignore
`.specstory` entirely. Do not weaken the root pre-commit policy or its subagent
requirements. Implementation authorization does not authorize local checks.

## Acceptance criteria

- Required checks fail closed, including on failed or skipped dependencies.
- Fork validations need no secrets; privileged release code comes from `main`.
- Production credentials are limited to protected environments.
- Database and Blob tests cannot use production resources.
- The real CMS, authentication, authorization, cache freshness, CSP, and public
  journeys have meaningful tests, with remaining limitations documented honestly.
- Manual setup instructions identify exact secrets, checks, permissions, and gates.
- No claim of successful verification or completed external setup without evidence.

## Verification commands and execution context

GitHub Actions runs `pnpm install --frozen-lockfile`, `pnpm ci:quality`,
`pnpm test:coverage`, `pnpm migrate:check`, `pnpm test:e2e:prod`, and the security
workflows automatically. These are not permissions for the agent to run local
checks. Local checks remain prohibited until an explicit request to commit, at
which point the unchanged root pre-commit process applies.
