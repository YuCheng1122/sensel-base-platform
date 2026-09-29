# SenseL UI Design

This is the shared design contract for SenseL Base and customer projects generated from it. Apply these defaults when implementing or reviewing frontend work. A customer's explicit requirement can change a default; document the reason and update the shared owner instead of layering page-specific overrides.

## Page layout

Overview, reports, platform settings, mail settings, model settings, users, groups and profile use the same `.sensel-page` frame:

| Property | Default |
| --- | --- |
| Page maximum width | 1280px, including horizontal padding |
| Alignment | Centered within the workspace after the sidebar |
| Desktop page padding | 24px |
| Mobile page padding | 16px below 640px |
| Vertical section gap | 24px |
| Wide-screen behavior | Stop growing at the shared maximum; equal margins on both sides |

`@sensel/ui` owns the frame and tokens. Reuse its exported stylesheet and `.sensel-page` class on a page's outer content element. In the base source, see `packages/ui/src/page-layout.css`; customer projects consume the installed stylesheet rather than copying it. Components can arrange form fields into readable columns without narrowing the page frame itself.

Do not add a second max-width or page padding inside the frame. A report's embedded overview is a component, not another page frame. Cards, tables and popovers manage their own internal spacing and overflow. On mobile, controls stack and wide tables scroll inside their own containers rather than widening the document.

Login and full-height Chat deliberately use separate layouts. Do not wrap them in the standard page frame. Keep the existing login composition, floating sidebar, mobile drawer and Chat interaction hierarchy.

## Typography

Use the project's Geist Sans token with system sans-serif fallbacks for headings, body text, controls and chart labels. All controls inherit the application font. Use the Geist Mono token with monospace fallbacks for code, IDs and technical payloads only. Do not introduce a new font family for a page or a chart.

Default scale: body and controls 14px; secondary labels 12px; page titles 24px/32px on desktop and 20px/28px on mobile; section headings 16px/24px. Use weight and spacing to express hierarchy instead of accumulating font sizes or faint explanatory text. PDF documents retain their separately bundled CJK font and license; browser font rules do not replace PDF font registration.

## Date and time filters

Reuse the shared analytics range picker. Its sizing follows Digiwin's existing TimeRangePicker:

- Compact trigger with the selected preset label, or a concise custom range; keep the text within 256px.
- Popover width up to 512px and no wider than viewport minus 32px.
- Four preset columns and two date/time columns on desktop; two preset columns and one date/time column on mobile.
- Date/time inputs have a 36px height. Preserve accessible labels, keyboard focus and viewport containment.

Keep the selected interval and relevant timezone clear. Range validation and query semantics remain explicit; changing the presentation does not change stored UTC values or maximum supported duration.

## Concise UI copy

Prefer a useful label or control over an explanatory paragraph. Do not automatically add a gray subtitle under every heading, field or chart. Remove statements that repeat the title or explain implementation details without helping the user decide what to do.

| Information | Presentation |
| --- | --- |
| Field name, unit or necessary timezone | A concise label near the relevant control or chart |
| Validation error or failed action | Visible, actionable feedback |
| Synthetic data, incomplete coverage or unknown outcome | Visible status near the affected result |
| Optional methodology or technical detail | A labeled, keyboard-accessible disclosure or developer documentation |
| Repeated description of an obvious action | Omit it |

For example, a chart does not need the permanent sentence `事件量 · UTC · 缺值保留斷點，不補為零。` below it. Keep necessary unit/timezone context concise, and place gap-handling detail with optional chart data. Missing values must still remain gaps; never convert them to zero to simplify the display.

This preference does not authorize hiding important state. Keep partial analysis, source errors, synthetic data and mail delivery uncertainty understandable. Provider acceptance is not confirmed delivery; unknown mail outcomes must not appear successful or trigger automatic resends.

UI labels currently remain Traditional Chinese. English documentation and coding-agent skills do not imply a product-language change.

## Components and style ownership

Reuse existing PageHeader, form controls, dialogs, tables and state components. Each package owns its component styles: UI primitives and frames in `@sensel/ui`, Chat in `@sensel/chat`, charts and filters in `@sensel/analytics`, report presentation and exports in `@sensel/reports`.

The UI stylesheet aggregates focused files. Remove obsolete rules instead of appending overrides. Customer queries, data authorization and domain-specific report schemas stay in customer code; a visual change must not bind shared components to SOC, Nginx or PCAP data models.

Use current light/dark color tokens. Maintain visible focus, readable contrast, associated input labels and truthful empty/loading/error states. Do not reduce opacity or remove labels merely to make a form look cleaner.

## Verification

For a shared layout change, compare overview, reports and every settings page at the same viewport. Use 1440px and a wider desktop viewport such as 1920px to expose max-width differences, plus 390px for mobile. Check actual content bounds, not only declared CSS. Inspect mobile drawers, long values, charts and open filter popovers.

Exercise interactions affected by the change, including keyboard operation and range validation. Use synthetic fixtures. Record what was checked, and distinguish screenshot review from behavior tests or a full accessibility audit.

## Design provenance and customer adaptation

The login, sidebar, basic controls and Chat were adapted from the Digiwin UI. Source provenance is tracked in the base package extraction manifests. This contract adds the user's shared-width, typography and concise-copy preferences; it does not require access to the original customer repo when building a new project.

A generated project's copy of this file is a starting contract. Document customer-specific changes here and keep their scope explicit. Use `sensel-frontend` when implementing pages and `sensel-ui-review` when checking them; both read this file rather than duplicating its numeric design values.
