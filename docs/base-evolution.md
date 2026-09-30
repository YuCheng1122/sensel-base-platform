# Shared Capability Evolution from the Nginx Project

Status: initial requirements and source review, followed by the 2026-09-30 implementation. The source-review table below preserves the pre-extraction baseline. See [reusable components and recipes](reuse-guide.md) for implemented APIs, examples and limits; the verification record reports executed checks.

## Evidence and scope

Reviewed the local `sensel-nginx-web-log` working tree (HEAD `7e4a5b6c9b0b9dcba10772c2f95f89097062aeba`), shared package differences, customer composition, tests and checked-in synthetic screenshots. HEAD alone does not establish the reviewed working-tree contents. The source repository remains read-only. No live providers, customer logs or credentials were queried. Existing tests were inspected, not rerun for this review.

The current customer screenshots are the first-version visual reference for overview hierarchy, ranking tables and report editing. Preserve that level of composition while replacing domain-specific labels and queries with customer inputs. Identical DESIGN.md and UI token files in both repositories show that tokens alone did not eliminate repeated page implementation.

## Required behavior and extraction ownership

| Capability | Source evidence | Shared destination / required outcome | Status in base |
| --- | --- | --- | --- |
| Sectioned reports | Customer `web/src/cdn-reports/outline-editor.tsx`, `outline.ts`, `reports.tsx`, `snapshot-pdf.tsx` | Reports package owns editable titles/text, section ordering/visibility, preview and graphic/text PDF composition | Fixed snapshot export and appended narrative sections exist; editable composition pending |
| Model usage and remaining quota | Customer `web/src/model-usage/token-usage.tsx`, `server/model-usage/service.ts`; UI `ModelSettings` extension | UI owns usage presentation; server/provider adapter owns authorized quota retrieval | Pending; customer source currently supports TokenFleet only |
| Overview composition | Customer `web/src/cdn/overview.tsx`, `trends.tsx`, `analysis-table.tsx` | Analytics/UI own reusable panels, trend/ranking composition and table controls | Generic overview exists; richer composition pending |
| Event raw detail | Customer `web/src/cdn/events.tsx`, `raw-log.tsx`, server `cdn/queries.ts` | Shared viewer consumes authorized detail DTO; customer retrieves original stored record | Pending shared detail contract |
| Entity detail and relationships | Customer `web/src/cdn/entity-related.tsx`, `events.tsx`, `rankings.tsx` | Shared detail frame and paginated lists; customer owns identity, attributes and relationships | Pending; source entity type only covers domain/IP, not general host detail |
| Chat tool history | Chat `chat-view.tsx`, `chat-message.tsx`, `chat-workspace.tsx` | Per-answer tool history with panel/drawer initially closed | Collapsed panel exists; per-answer inspection pending |
| Addressable navigation | Customer `web/src/app/page.tsx` and route pages | Customer template owns real routes, history and direct navigation | Base still selects screens using state at `/` |
| Agent execution improvements | Python runtime/profile/tools and server Agent bridge | Shared deadlines, trusted request time and bounded partial-evidence explanation | Pending separate runtime extraction and tests |

The report package itself is unchanged between repositories; the new report workflow lives in customer composition. Do not copy CDN snapshot schemas, Elasticsearch queries, authorization policy, security prompts or TokenFleet-specific assumptions into generic UI contracts.

## Reports: editable chapters, preview and graphic/text output

The primary user workflow is to choose a template, edit each chapter's title and prose, arrange chapters, preview the result, save a snapshot and download it with both text and graphics. A fixed dashboard followed by extra paragraphs is insufficient.

Required shared behavior:

- Editable title and multiline text on every chapter, including chapters containing charts, metrics or tables.
- Reorder chapters, include/omit them, add/remove text chapters and restore a supplied default outline.
- Resolve allowlisted value placeholders from saved data. Display unresolved placeholders explicitly; never evaluate arbitrary expressions or fetch live values during rendering.
- Preview the draft chapter composition before saving and preview the saved report afterward. If draft data has not been collected, label the preview as a draft with unavailable data; never invent a successful query.
- Generate browser preview and PDF from one versioned report structure and resolved content. Share chapter order, prose, selected series, units, time zone, legends and completeness disclosures; pagination may differ.
- Support Chinese text, paragraphs, long titles and values, page breaks, repeated table headings where needed, page numbers and vector charts. Preserve unknown gaps and visible isolated points.
- Save the data, chapter content and presentation settings needed to reproduce the report. Recheck authorization on download; rendering must work without the live analysis provider. Editing a saved report creates a new snapshot.
- Keep CSV/JSON as structured data exports. Do not imply CSV preserves graphic layout or is a complete raw-event export.

Customer input: default outline/prose, business data, labels, units, authorized snapshot capture and placeholder values. Shared reports code: editor, validated document structure, preview, export layout and download states. Proposed structures are design requirements, not importable API names yet.

Source gaps to fix during extraction: the current web preview can show HTTP status series while PDF draws only source totals; PDF does not display every saved limitation. Its chart code omits isolated points and uses a minimum maximum of one, including for all-unknown data. The current editor precedes snapshot creation, but the rendered report preview is shown only after saving. These are source observations, not a completed browser acceptance result.

## Model usage and remaining quota

Distinguish provider-account/key quota from per-execution token usage. The source implementation retrieves TokenFleet's used/available/granted quota and explicitly labels it as an API-defined unit shared by the key; it is not a measurement of individual Agent runs.

The shared display must accept provider name, scope (key/account/model/run), unit or currency, used amount, remaining amount, limit/unlimited state, period/expiry, checked-at time and availability state. Unknown, unsupported, unavailable and unlimited must remain distinct. Do not subtract incomparable units or label a missing allowance as zero. Shared keys must not appear to have independent balances per model.

A server adapter handles provider authorization, secret decryption, bounded responses, timeouts, caching and request coalescing. Provider keys never reach the browser. Unsupported providers show an explicit capability state. TokenFleet may be a first adapter; supporting its endpoint does not establish support for every model provider. Automated checks use mocked responses, not a live quota query.

## Overview, raw events and entity exploration

First-version overview composition must meet the current Nginx reference: a shared page header and compact filters; source/coverage status; metric cards; a primary trend; secondary trend/ranking rows; searchable, sortable paginated analysis tables; and recent events with detail actions. Desktop aligns card edges and spacing; mobile stacks sections and contains table overflow. Customer metrics and HTTP/security labels are not shared defaults.

Every event list must offer full authorized raw-record inspection, alongside readable normalized fields, source, identity and time. A normalized summary is not the original record. Fetch detail on demand through an authorized customer adapter. If the source cannot provide the original record, or fields are redacted/truncated, label that limitation explicitly. Raw event viewing does not automatically place raw records into Agent traces or report snapshots.

Every individual entity (for example host, domain or IP) must have a detail destination with stable identity, available attributes, scope/time range, relevant metrics, related entities and associated events. A name that only applies a filter is not a sufficient entity detail experience. Missing attributes remain unavailable rather than fabricated. Domain/IP support in the source must be generalized deliberately for hosts and other entity types.

All unbounded event/relationship lists require pagination or a dedicated browsable detail list. Choose cursor or offset pagination according to the backend; show totals only when known and do not provide a last-page jump for an unknown cursor chain. Search/sort run over the declared query scope, reset pagination when changed and retain time/entity filters when drilling down. A bounded top-N list must state its limit and provide a path to further exploration.

## URLs and navigation

The template must provide `/overview`, `/chat`, `/reports` and `/settings/...` routes. Give `/` a documented landing/redirect policy. Do not implement primary navigation solely as local state under `/`.

Use addressable event/entity detail routes, such as `/events/[id]` and `/entities/[type]/[id]`, with customer-owned stable opaque identifiers. These route conventions are now demonstrated by the synthetic template; customer authorization and query adapters remain project-owned. Details may appear in drawers, but direct opening, refresh and browser Back must restore meaningful state. Preserve supported range, filter and pagination state in URLs using validated parameters; do not expose raw payloads or credentials in URLs. Route visibility never replaces API authorization.

The customer source already has top-level routes, but re-exports a shared root component and derives the active screen from the last path segment. That approach is not sufficient for nested entity routes; implement explicit route composition rather than copying the last-segment heuristic.

## Chat and tool visibility

Tool panels/drawers start closed on desktop and mobile and never open automatically on tool execution. Each answer with tool calls offers an explicit action to inspect that answer's calls, outcomes and safe trace details. The global toggle must have a clear selected-run meaning rather than mixing all conversations. Closing details must not stop execution or lose the trace.

Running, partial, failed and cancelled answer states stay visible even when the tool panel is closed. Suggestions and their categories are injected by the customer. Provider configuration links depend on user permissions. Runtime changes require cross-language contract tests independent of visual changes.

## Reuse documentation required with each implementation

For every extracted capability, publish the actual export/import path and stylesheet, a runnable synthetic example, required/optional props or DTO fields, customer adapter responsibilities, authorization boundaries, loading/empty/error/partial states, and the verification performed. Include copyable recipes for the overview composition, report editing/preview/export, usage adapters, raw-event/entity drill-down, routed navigation and per-answer traces.

Use a component catalog mapping user tasks to existing components and examples. Clearly label planned APIs so coding agents cannot mistake them for installed exports. Keep design defaults in DESIGN.md, implementation recipes in package/integration documentation and task steps in canonical skills. Generated projects must receive the applicable instructions and examples; test this through project generation and independent installation. A package upgrade does not automatically update customer instructions.

## Implementation batches and acceptance

1. **Navigation and documentation foundation:** real routes and a component catalog; direct URL, refresh, Back/Forward, authorization and generated-project checks.
2. **Sectioned reports:** shared editor/document structure and matching preview/PDF; verify edited text, order, omissions, placeholders, graphics, all-unknown/single-point trends, long Chinese pagination, saved-data-only export and legacy snapshots.
3. **Overview and drill-down:** reusable table/chart/layout/detail primitives; verify 1440/1920/390px and light/dark, long values, raw completeness, known/unknown pagination and entity-to-event navigation with retained scope.
4. **Agent/settings:** usage display/provider interface, per-answer trace selection and runtime improvements; verify fake-provider quota states, initial panel visibility, correct trace selection, deadlines, cancellation and partial evidence.

Documentation requirements apply to every batch rather than a final cleanup step. Do not claim the first-version target complete solely because reusable primitives exist: the generated template must demonstrate the composed experience with clearly marked synthetic data. Record screenshots, behavior checks and unverified limits separately. The original review did not authorize source-customer changes, live provider calls, publication or deployment. The subsequent implementation and push to the new remote were explicitly requested by the user.


## Implementation status: 2026-09-30

All four batches now have shared implementations and generated-template examples. Consult [reuse recipes](reuse-guide.md) for installed exports and adapter boundaries, [screenshots](images/README.md) for current synthetic captures, and [verification](verification.md#platform-evolution-2026-09-30) for executed checks. The initial source comparison above records the starting point, not the current package inventory. Arbitrary customer chart schemas, real quota-provider acceptance and per-run billing remain outside this implementation.
