---
name: sensel-ui-review
description: Review SenseL frontend changes for cross-page consistency, responsive layout, typography, and concise yet truthful copy. Use for UI acceptance or visual regression reviews.
---

# SenseL UI review

Read root `DESIGN.md` for current design values and the relevant implementation diff. Review the requested scope; do not turn an ordinary visual check into a redesign.

For these capabilities, use the relevant `docs/reuse-guide.md` recipe to distinguish shared behavior from customer integration. Exercise direct route loading, refresh and Back; raw-event inspection; entity attributes and relationship pagination; chapter editing and preview/PDF agreement; truthful quota states; and tool panels staying closed during execution. Check only capabilities affected by the change.

## Compare observable behavior

- For shared layout changes, at equal viewport widths compare the left and right content edges of overview, reports, platform settings, mail, models, users and groups. Check that a narrow form has not narrowed the whole page.
- For an isolated page change, review that page and affected shared components rather than every unrelated settings screen.
- Include 1440px and a wider desktop viewport so max-width differences are visible; include 390px for mobile. Check actual bounding boxes and screenshots, horizontal overflow, long labels and opened filter popovers.
- Verify the shared font reaches headings, fields, buttons and chart labels. Monospace should have a technical purpose.
- Compare range-picker dimensions with DESIGN.md. Open it and check keyboard interaction, presets, selected range and mobile containment.
- Identify gray prose that repeats headings, describes code internals or adds no decision value. Prefer removing it or using a labeled disclosure; ensure synthetic/partial/error/unknown states remain understandable without opening developer details.
- Preserve visible units/timezone where ambiguity matters. Confirm charts still represent missing values honestly and reports still describe saved snapshots.

Use the project's browser tooling and isolated synthetic fixtures; do not create customer data or send real email for a review. A screenshot alone does not prove the controls work; exercise interactions affected by the change.

Report findings with page, viewport, observed behavior and practical effect. Separate failures from stylistic suggestions and record what was actually verified. If a fix is authorized, keep it in the shared owner rather than adding a page-specific override.
