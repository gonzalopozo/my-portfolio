---
name: verify
description: Run the full project verification pipeline — lint, format check, spellcheck, and tests. Use before marking work as done or before committing.
---

Run the full verification pipeline for this project. Execute each step sequentially and report results:

1. **Lint**: `pnpm lint`
2. **Format check**: `pnpm format:check`
3. **Spellcheck**: `pnpm spellcheck`
4. **Unit tests**: `pnpm test -- --run`

If any step fails, stop and report the failure with the full error output. Do not proceed to the next step until the current one passes.

If all steps pass, report success with a brief summary.

Note: This does NOT run `pnpm build` (slow) or Playwright E2E tests. For a full build check, run `pnpm build` separately. For E2E tests, run `pnpm exec playwright test`.
