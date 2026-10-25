# Vermilion and Warm Ink — palette review

Status: A — Balanced vermilion selected and implemented in the application.

## Canvas

Open `../.tmp/e.pen` in Pencil. Start with **START HERE — Five palette directions**.

The canvas contains 13 top-level frames: an overview, two current-token references, and five light/dark candidate pairs. Light is on the left; dark is on the right. Every candidate includes a desktop portfolio excerpt, an admin project form, a mobile profile excerpt, semantic swatches, button states, focus, and measured contrast.

The user explicitly selected the existing `.tmp/e.pen` file for this exploration.

## Directions

| Candidate              | Character                                                                     | Light signature | Dark signature |
| ---------------------- | ----------------------------------------------------------------------------- | --------------- | -------------- |
| A — Balanced vermilion | A clear red-orange signature. My recommended balance of energy and precision. | `#B73820`       | `#FF805F`      |
| B — Lacquer red        | Deeper and redder. Crisp, deliberate, with a more formal character.           | `#B52F35`       | `#F7797D`      |
| C — Burnt vermilion    | Earthier orange-red. Warm and tactile without beige surfaces.                 | `#A64526`       | `#E9956D`      |
| D — Bright orange-red  | The most energetic option. Orange leads while surfaces stay quiet.            | `#B63B0B`       | `#FF914F`      |
| E — Mineral red        | A softened, lower-saturation signature. Quiet, considered, understated.       | `#9C493E`       | `#D99585`      |

**Recommendation: A.** It balances a clear red-orange identity with comfortable reading surfaces. D is more energetic; E is more subdued. The neutrals remain identical between candidates so the signature can be compared directly.

## Shared semantic colors

| Role                        | Light     | Dark      |
| --------------------------- | --------- | --------- |
| Page                        | `#F4F2EF` | `#151413` |
| Card                        | `#FFFEFC` | `#211F1D` |
| Secondary / quiet selection | `#E9E5E1` | `#2E2B28` |
| Primary text                | `#22201F` | `#F5F2EE` |
| Secondary text              | `#66615D` | `#BBB3AA` |
| Decorative border           | `#D6CFC8` | `#49433E` |
| Required input boundary     | `#8B8178` | `#887E74` |
| Text on signature button    | `#FFFFFF` | `#21140F` |
| Error                       | `#A32148` | `#FF91B3` |
| Success                     | `#28704E` | `#83C6A0` |

Use signature color for primary actions, links, and focus. Use quiet selection backgrounds with readable foreground text in the admin. Error states use a distinct rose color and a visible message. Decorative borders are not substitutes for required control boundaries.

## Verification

Contrast uses WCAG relative luminance calculated from opaque sRGB colors. Values below are rounded for display; pass/fail uses unrounded values.

| Candidate | Theme | Signature | Link / secondary surface | Button label / signature |
| --------- | ----- | --------- | ------------------------ | ------------------------ |
| A         | light | `#B73820` | 4.66:1                   | 5.83:1                   |
| A         | dark  | `#FF805F` | 5.70:1                   | 7.26:1                   |
| B         | light | `#B52F35` | 4.90:1                   | 6.14:1                   |
| B         | dark  | `#F7797D` | 5.35:1                   | 6.82:1                   |
| C         | light | `#A64526` | 4.79:1                   | 6.00:1                   |
| C         | dark  | `#E9956D` | 6.02:1                   | 7.67:1                   |
| D         | light | `#B63B0B` | 4.63:1                   | 5.80:1                   |
| D         | dark  | `#FF914F` | 6.31:1                   | 8.04:1                   |
| E         | light | `#9C493E` | 4.88:1                   | 6.11:1                   |
| E         | dark  | `#D99585` | 5.75:1                   | 7.33:1                   |

All candidates share:

- Primary text on cards: **16.10:1 light**, **14.72:1 dark**.
- Secondary text on secondary surfaces: **4.88:1 light**, **6.80:1 dark**.
- Input boundary on cards: **3.78:1 light**, **4.13:1 dark**.
- Error text on cards: **7.26:1 light**, **7.79:1 dark**.

The canvas audit resolved actual variables and checked **783 text/background pairs**, including the overview and all proposed screens: **zero failures at 4.5:1**. Current-token references were excluded from that pass because their known contrast weaknesses are intentionally preserved. Separate token checks cover button hover/pressed colors, focus against secondary surfaces, success, and input boundaries.

Rendered screenshots were inspected for all five paired public studies, both current-token references, and representative admin/mobile frames. Final canvas bounds inspection found no clipping or overflow.

## Implementation

A is applied to the public portfolio and shared admin theme. The source colors use OKLCH equivalents of the approved sRGB references. Primary actions have explicit hover/pressed colors. Quiet neutral selections, distinct destructive colors, opaque focus indicators, input boundaries, and readable media overlays now have separate roles.

The older dark portfolio override of secondary text has been removed. The BB-8 illustration uses `--bb8-accent`, avoiding a collision with the UI selection token. The map marker uses the signature palette; the logo and CMS-configured social colors remain as shown in the design exploration.

## Verification and limits

- Full test suite: 135 tests passed, including 46 new source-token contrast cases.
- TypeScript compilation passed.
- Public desktop and mobile screenshots inspected in both themes; the final dark-mode override removal is included in the source-token checks.
- Automated browser checks found existing heading-order and landmark issues. These are outside the palette change.
- Decorative card pseudo-elements prevent some automated contrast measurements. A diagnostic rerun with only the behind-card decorative pseudo-element disabled reported no contrast violations; media overlays are covered separately by a worst-case white-artwork contrast calculation.
- The admin dashboard redirects to login without an authenticated session. Shared admin controls are covered by token tests; authenticated dashboard behavior has not been exercised.

No dependencies, database changes, production build, deployment, or commit were added. The design canvas remains in the user-selected `.tmp/e.pen` file.
