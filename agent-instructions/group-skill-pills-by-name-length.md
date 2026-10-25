# Group Skill Pills by Name Length

## Objective

Arrange the public project skill pills into intentional rows based on the
combined lengths of their visible names.

## Relevant Context

- The implementation lives in `components/public/skills-pills.tsx`.
- Project cards reuse this component in vertical and horizontal layouts.
- The existing `limit` prop hides overflow skills and displays a `+N` badge.
- Badge icons, padding, and gaps make character count an approximation rather
  than a physical width measurement.

## Required Behavior

- Preserve the input skill order.
- Sum `skill.name.length` while building each row.
- Start the next skill on a new row when adding it would make the current row
  exceed 18 characters.
- Allow an individual name longer than 18 characters to occupy its own row.
- Append the `+N` badge to the final visible row without counting it toward the
  character budget.
- Render a count-only row when `limit` is zero.
- Continue returning `null` for an empty `skills` array.
- Allow an intended row to wrap further when its rendered badges cannot fit a
  narrow card.

## Constraints

- Keep the `SkillsPills` props unchanged.
- Keep the existing shadcn `Badge` and its `secondary` variant.
- Do not add client state, DOM measurement, dependencies, or theme tokens.
- Preserve caller-provided root layout classes and gap overrides.
- Ignore `.specstory` entirely.

## Acceptance Criteria

- Names totaling 18 characters stay in one row.
- The skill that would take a row above 18 starts the next row.
- Hidden counts appear after the last visible skill.
- The outer container stacks computed rows and each row retains responsive
  wrapping.
- Focused component tests cover threshold, overflow, limit, and empty states.

## Verification Commands

```sh
pnpm exec vitest run components/public/skills-pills.test.tsx
pnpm format:check
pnpm lint
pnpm exec tsc --noEmit
```

Do not run `pnpm build` during routine implementation verification.
