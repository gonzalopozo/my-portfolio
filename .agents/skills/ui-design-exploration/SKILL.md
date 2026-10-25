---

name: ui-design-exploration
description: Use when the user wants to redesign, improve, modernize, restyle, or explore alternative visual designs for an existing UI, component, page, screen, dashboard, form, layout, navigation, or frontend experience. Use the pencil MCP to create multiple visual candidates on a canvas before modifying application source code.
---

# UI Design Exploration

Use this skill for frontend design exploration before implementation.

The purpose of this workflow is to separate:

1. design exploration;
2. human visual selection;
3. source-code implementation.

Do not collapse these phases.

## Core rule

When this skill is active, application source code is READ-ONLY during the design exploration phase.

You may inspect the existing codebase to understand:

* the current page or component;
* functionality and interactions;
* data displayed;
* existing design system;
* Tailwind configuration;
* CSS variables and design tokens;
* typography;
* reusable components;
* layout constraints;
* responsive behavior.

You MUST NOT modify application source code until the user explicitly approves a design candidate.

## Required tool

You MUST use the `pencil` MCP server for visual design exploration.

Before starting design work:

1. Verify that the `pencil` MCP server and its tools are available.
2. If `pencil` is unavailable, STOP.
3. Tell the user that the Pencil/pen.dev MCP is unavailable.
4. Do NOT fall back to modifying the application source code directly.

Do not substitute HTML files, React components, screenshots, SVG mockups, or temporary application routes for the Pencil canvas unless the user explicitly requests that approach.

## File location

Create all `.pen` files inside the `designs/` folder at the repository root:

* `designs/<feature-or-page>.pen`

Create the `designs/` folder if it does not exist.

Never place `.pen` files in application source directories such as `app/`, `components/`, or `lib/`.

## Phase 1: Understand the existing UI

Inspect the implementation requested by the user.

Read all relevant:

* page files;
* components;
* styles;
* design tokens;
* reusable primitives;
* assets;
* layout containers;
* responsive rules.

Understand the current functionality before designing alternatives.

Do not modify these files.

## Phase 2: Establish the baseline

Use the `pencil` MCP to create or open an appropriate `.pen` design.

Create or open it at `designs/<feature-or-page>.pen` (see File location).

Unless the user explicitly says otherwise, recreate the relevant current interface as:

`00 - CURRENT`

This is the visual baseline.

Keep it visible throughout exploration.

Do not overwrite it.

## Phase 3: Generate alternatives

Unless the user specifies another number, create FIVE substantially different design candidates for the SAME brief:

* `01 - VARIANT A`
* `02 - VARIANT B`
* `03 - VARIANT C`
* `04 - VARIANT D`
* `05 - VARIANT E`

Place all variants on the same canvas so they can be compared visually.

Each candidate must preserve required:

* functionality;
* content;
* information;
* interactions;
* application semantics.

The variants must represent genuinely different design directions.

Explore meaningful differences in areas such as:

* information hierarchy;
* layout;
* component composition;
* navigation;
* spacing;
* density;
* typography hierarchy;
* visual emphasis;
* card structures;
* content grouping;
* responsive organization.

Do NOT create five trivial variations that mainly change:

* colors;
* border radius;
* shadows;
* minor spacing;
* decorative details.

Prefer structural design differences.

## Candidate diversity

Unless the user's prompt suggests another approach, use roughly these design directions:

### Variant A — Evolution

A restrained improvement of the existing interface.

Preserve much of the current structure while improving hierarchy, spacing, consistency, and polish.

### Variant B — Dense

A compact, information-efficient professional interface.

Optimize for power users and information visibility.

### Variant C — Minimal

A spacious, simplified interface.

Reduce visual noise and emphasize essential actions and content.

### Variant D — Strong hierarchy

Explore a more opinionated layout with clearer visual hierarchy, grouping, typography, and emphasis.

### Variant E — Experimental

Explore a substantially different structural approach while preserving functionality and usability.

These directions are starting points, not rigid visual styles.

Adapt them to the product.

## Phase 4: Visual verification

After generating each candidate, use Pencil's available screenshot/render/visual inspection capabilities.

Inspect for:

* clipping;
* overflow;
* alignment problems;
* inconsistent spacing;
* poor hierarchy;
* accidental overlap;
* unusable controls;
* broken visual grouping;
* obvious responsive/layout problems.

Correct obvious defects before presenting the candidate.

Do not silently collapse candidates into one design.

## Phase 5: Stop for human selection

When the alternatives are ready:

STOP.

Do NOT modify application source code.

Briefly tell the user that the candidates are ready for review.

The user may then:

* choose one candidate;
* reject all candidates;
* request more candidates;
* ask to refine one;
* combine parts of several candidates.

Continue working only in the Pencil canvas until the user explicitly authorizes implementation.

Examples of implementation authorization include:

* "Implement Variant C."
* "Use C."
* "Apply this design."
* "Implement the selected version."
* "Use B's layout with D's navigation, then implement it."

Do not interpret ordinary design feedback as permission to modify the application.

## Combining candidates

If the user likes parts of several candidates, create a NEW candidate rather than destroying the originals.

For example:

`06 - VARIANT F`

Combine the requested characteristics there.

Keep previous candidates intact for comparison.

Again, stop for approval unless the user explicitly requested implementation.

## Phase 6: Implementation

Only after explicit approval may application source code be modified.

Before implementing:

1. Identify exactly which candidate was approved.
2. Inspect it using Pencil.
3. Map its design back onto the existing component architecture.
4. Reuse existing components and design-system primitives when reasonable.
5. Preserve existing functionality.
6. Avoid unnecessary architectural changes unrelated to the selected design.

Implement the approved design in the actual application.

After implementation:

* run relevant formatting;
* run type checking;
* run linting;
* run applicable tests;
* inspect the rendered application where possible.

Do not regenerate a different design during implementation unless required by technical constraints.

## Non-negotiable constraints

During design exploration:

* MUST use `pencil`.
* MUST NOT modify production application files.
* MUST preserve previous design candidates.
* MUST generate multiple candidates.
* MUST keep candidates visually comparable.
* MUST stop for human selection.
* MUST NOT interpret "improve", "redesign", "make better", or similar wording as implementation permission.

If Pencil cannot be used, stop rather than bypassing this workflow.
