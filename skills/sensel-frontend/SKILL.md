---
name: sensel-frontend
description: Build or adjust SenseL and derived customer frontend pages using the shared layout, typography, filters, and concise UI copy. Use for pages, forms, charts, reports, or visual consistency work.
---

# SenseL frontend

Read the project root `DESIGN.md` and `AGENTS.md` before editing. Those files own current design values and project boundaries; do not maintain a second set of numeric tokens here. In a customer repo, use installed platform components and customer extension points, not edits inside node_modules.

## Compose the page

- Inspect a comparable existing page and reuse its shared page frame, PageHeader, fields, buttons and state components. Overview, reports and settings align to the same outer content edges; form internals may use columns without narrowing the entire page.
- Let the shared page token own maximum width and gutters. Avoid per-page max-width, nested page padding or late CSS overrides. Login and full-height Chat have distinct documented layouts.
- Use the project font tokens everywhere, including chart labels and form controls. Reserve monospace for code, IDs and genuinely technical values.
- Use the shared range picker with its documented trigger/popover size. Keep it compact on desktop and contained on narrow screens; do not stretch it simply because header space is available.

## Write only useful UI copy

The user prefers clear controls and little gray supplementary prose. A heading does not automatically need a subtitle, and each card does not need a technical explanation.

For each explanation, ask whether it changes the user's action or interpretation:

- Keep field labels, units, relevant timezone, validation errors, incomplete data, synthetic data, irreversible actions and unknown outcomes visible where needed.
- Move optional methodology or implementation details into an accessible disclosure, or developer documentation. Remove repeated explanations already clear from the control.
- Example: replace the permanent caption `事件量 · UTC · 缺值保留斷點，不補為零。` with concise chart labeling; place missing-value interpretation with optional chart details. Do not remove the gap behavior or relabel unknown values as zero.
- Never use this preference to hide mail delivery uncertainty, failed tools, missing coverage or fake results.

For event-list examples, reuse EventTable search, category/level filters and sortable headers. Filtering and sorting precede local pagination; do not imply they queried the entire backend dataset or changed aggregate charts.

## Implement and verify

Keep style ownership with the component's package; remove superseded rules rather than layering fixes. Reuse the shared contract and keep customer queries out of UI packages. Preserve keyboard labels, focus and disclosure behavior.

Check the requested change in its real rendered page, including a narrow viewport. For shared layout changes compare overview, reports and every settings page at the same viewport; inspect actual content edges, not only CSS declarations. Follow project testing instructions and use synthetic data. Do not infer authorization to publish, deploy or call real providers from this skill.
