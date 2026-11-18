# Temporary dependency patches

## picomatch repeated extglobs

Advisory: [GHSA-fc5q-39xc-vjpf / CVE-2026-112366](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
As of November 18, 2026, the advisory lists every published version through 4.0.7
as affected and provides no patched release. `pnpm audit:fix` cannot upgrade to a
fixed version.

The three version-specific pnpm patches cover the installed 2.3.2, 4.0.4 and 4.0.7
copies without forcing legacy consumers onto another major version. The patches
are local mitigations, not an upstream release or an upstream-reviewed fix.

The existing parser only checks some repeated extglob shapes. A single wildcard
branch such as `+(*)` or `+(*a)` can still produce nested unbounded repetition.
The patch detects active wildcard tokens inside a repeated extglob and routes it
through the parser's existing literal fallback. This deliberately stops those
patterns from behaving as wildcards. Escaped stars, quoted stars, character
classes, ordinary globs and simple repeated literal alternatives retain their
existing behavior. The guard remains active if a caller disables the existing
recursion limit.

`pnpm-workspace.yaml` registers each patch and `pnpm-lock.yaml` records its hash.
pnpm applies the patches during installation with lifecycle scripts disabled.
Do not edit installed files manually or replace package versions to disguise
their advisory status.

`pnpm audit` checks the published package versions, so it cannot see the local
patches. The temporary `audit.ignore` entry in `pnpm-workspace.yaml` filters
only GHSA-fc5q-39xc-vjpf. The CircleCI dependency job still audits all other
high and critical findings.

Regression coverage in `tests/security/picomatch-patches.test.ts` resolves the
actual copies used by ESLint, dependency-cruiser and Vitest. Adversarial matching
runs in child processes with a deadline so a missing patch cannot hang the test
worker. The cases cover the unsafe fallback, parser options, nested alternatives
and ordinary glob compatibility. Run this coverage during an authorized commit
verification pass; adding the patch does not authorize local checks by itself.

When upstream publishes a fix, review its advisory coverage, update each affected
consumer within its supported major version, remove the obsolete patch entries
and files, remove the `audit.ignore` entry, and regenerate the lockfile with
pnpm. Then rerun the audit and the regression coverage as part of authorized
verification.
