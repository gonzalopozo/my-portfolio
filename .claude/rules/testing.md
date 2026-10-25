---
description: Testing conventions — file locations, naming, mocking patterns, what to test. Applies to test files.
globs:
    - 'tests/**'
    - 'e2e/**'
    - 'vitest.config.*'
    - 'playwright.config.*'
---

## Testing Rules

### Strategy

| Code Layer          | Strategy                                  | Tool         |
| ------------------- | ----------------------------------------- | ------------ |
| Zod schemas         | **TDD** (test first)                      | Vitest       |
| Utility functions   | **TDD**                                   | Vitest       |
| Server Action logic | **TDD for validation, test-after for DB** | Vitest       |
| Junction table sync | Test-after                                | Vitest       |
| Client components   | Test-after (optional)                     | Vitest + RTL |
| Pages, auth flows   | Test-after                                | Playwright   |

**Don't test**: shadcn/ui primitives, better-auth config, Tailwind classes, Next.js framework behavior, simple data-fetching pages, async RSCs (use Playwright instead).

### File Locations & Naming

- Vitest: `tests/**/*.test.{ts,tsx}` — mirror source structure
- Playwright: `e2e/**/*.spec.ts` — named by flow (`auth.spec.ts`)
- Test names: behavior for Vitest (`"rejects empty title"`), user action for Playwright (`"should create a new project"`)

### Mocking

- **Mock at module level** with `vi.mock(...)` — Vitest hoists automatically
- **Use `vi.mocked()` for type-safe access** to mocked functions
- **Reset mocks**: `beforeEach(() => { vi.clearAllMocks(); })`
- **Don't mock what you're testing** — test schema? don't mock Zod. Test action? mock db, not the action.
- `redirect()` mock: throw `Error("REDIRECT:/path")` to mirror Next.js behavior
- `revalidatePath()`: `vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))`

### Vitest Practices

- One assertion per concept
- Arrange-Act-Assert pattern
- Test edge cases: empty strings, null, boundary values, special characters
- Use `it.each` for parameterized tests
- Keep suite under 10 seconds — if slower, check for real network calls or missing mocks

### Playwright Practices

- Locator priority: `getByRole` > `getByLabel` > `getByText` > `getByTestId` > CSS selectors
- Test user-visible behavior (`toBeVisible`, `toContainText`), not DOM structure
- Don't add `page.waitForTimeout()` — use auto-waiting
- Test the unhappy path: errors, unauthorized redirects, delete confirmations

Full mock code blocks and CI setup: see AGENTS-TESTING.md and AGENTS-TESTING-REFERENCE.md
