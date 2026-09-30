# Reusing SenseL Capabilities

Use this guide with DESIGN.md. The generated project includes the same guide at `docs/reuse-guide.md`; its working examples live under `web/src/app/` and `web/src/server/`. In the platform checkout those paths are under `templates/project/`. All example data is explicitly synthetic.

## Component catalog

| Task | Actual import / stylesheet | Working composition | Customer responsibility |
| --- | --- | --- | --- |
| Page frame, fields, dialogs | `PageHeader`, `Field`, `Button`, `SettingsDialog` from `@sensel/ui`; `@sensel/ui/styles.css` | `web/src/app/page.tsx` and settings pages | Branding and route authorization |
| Searchable sortable paged table | `DataTable`, `TableQuery`, `TableColumn` from `@sensel/ui` | `web/src/app/exploration-pages.tsx` | Full-scope query, stable row IDs, total or unknown total |
| Overview | `EventOverview`, `OverviewDashboard`, `MetricCards`, `TrendChart`, `StackedTrendChart`, `CategoryDistribution` from `@sensel/analytics`; `@sensel/analytics/styles.css` | `web/src/app/analysis-pages.tsx` | Authorized `OverviewAdapter` and optional extra panels |
| Raw record | `RawEventView` from `@sensel/analytics`; DTOs from `@sensel/analytics/exploration` | `/events/[id]` | Authorized original record, completeness/redaction disclosure |
| Entity and related events | Exploration DTOs plus `DataTable` and page primitives | `/entities/[type]/[id]`, `synthetic-exploration.ts` | Entity identity, attributes, relationships, scoped event queries |
| Editable reports | `ReportsCenter`, `ReportChapterEditor`, `ReportChapters`, `defaultChapters` from `@sensel/reports`; `@sensel/reports/styles.css` | `/reports`, `feature-adapters.ts` | Sources, defaults, authorized capture/get/list/delete and optional preview |
| Report contracts and exports | Types from `@sensel/reports/contracts`; CSV/JSON/download helpers from `@sensel/reports/exports`; PDF/font from `@sensel/reports/pdf` | `reportsAdapter` and shared download control | Serve the bundled licensed CJK font; preserve snapshots |
| Conversations | `ChatWorkspace`, `ChatSuggestions`, `ChatSuggestion` from `@sensel/chat`; `@sensel/chat/styles.css` | `/chat` | Suggestions, tools, domain prompt, model-configuration navigation |
| Quota | `ModelUsageCard`, `ModelUsage` from `@sensel/ui`; pure type also at `@sensel/ui/usage-contracts` | `/settings/models` | Provider-specific quota adapter or explicit unsupported status |
| Quota transport | `createTokenFleetUsageProvider`, `UsageProvider` from `@sensel/server` | `web/src/server/core.ts` | Server secrets and provider contract; no browser API keys |

Import each package stylesheet once in the app layout. Do not copy shared CSS into customer pages or modify installed node_modules. Public exports are reusable; template files are editable composition, not platform APIs.

## Overview and navigation recipe

The template demonstrates filters, coverage, metrics, a main trend, paired distributions, host/domain ranking tables and recent events. `EventOverview` accepts `adapter`, `initialQuery`, `defaultRangeDays`, `timeZone`, `onQueryChange`, `eventHref` and `renderPanels`. `renderPanels(data)` composes customer panels before the recent-event table; `eventHref(id, query)` creates authorized detail links with the same time/source scope. Charts do not perform business queries.

```tsx
<EventOverview
  adapter={overviewAdapter}
  initialQuery={queryFromUrl}
  timeZone="Asia/Taipei"
  onQueryChange={writeQueryToUrl}
  eventHref={(id, query) => makeEventUrl(id, query)}
  renderPanels={data => <CustomerRankings query={data.query} />}
/>
```

The callbacks/components above are customer-owned; the template's `analysis-pages.tsx` provides a working implementation. The template uses real routes `/overview`, `/chat`, `/reports`, `/events`, `/events/[id]`, `/entities/[type]/[id]` and `/settings/{platform,mail,models,users,groups,profile}`. `/` redirects to `/chat`. Authentication preserves a directly requested destination. List/detail pages retain time/source and event pagination/search/sort in validated URL parameters; API authorization remains mandatory. Nested details deliberately map to the overview navigation item rather than guessing from the last path segment.

## Tables and entity detail

`DataTable<T>` is controlled. Supply `title`, `columns`, `rows`, `rowKey`, `query`, `onQuery` and `total`; optional `busy` and `error` expose request state. Column fields are `key`, `label`, `render(row)`, optional `numeric` and `sortable`. `query` contains page (1-based), pageSize, search, sort and order. The component resets the page on search/sort; the adapter executes them before pagination. Set total to null if unknown. Unknown-total mode has no last-page jump and uses returned page size as a continuation hint; use a dedicated cursor control when the provider requires opaque cursors rather than inventing offset support.

`CoreConfig.explorationProvider(actor)` supplies the four `ExplorationAdapter` operations: events, event, entities and entity. They receive scope and cancellation signal. The authenticated `/api/core/explore/...` endpoints validate the common query; the customer adapter must enforce current resource permissions and source filters on every operation. The synthetic adapter illustrates the shape without implying real customer authorization.

`RawEvent` separates normalized `fields` from `raw`, with `rawState` complete/redacted/truncated/unavailable. Only call a record complete when the authorized original record is actually returned. Raw data is rendered as text and fetched on demand; it is not forwarded automatically into traces or report snapshots.

Entity detail includes type/id/label, attributes and returned related references. The example pages locally paginate the returned reference list and server-page the associated events. For large relationship populations, replace the bounded returned reference list with an authorized paginated relationship query; do not claim that a partial returned list is the full population. Hosts must have available host attributes, not just a clickable count. Missing source fields remain unavailable.

## Sectioned report recipe

`ReportChapter` has stable id, kind (`text`, `metrics`, `trend`, `categories`, `events`), title, multiline body and enabled. The shared editor changes title/body, order and inclusion, adds/removes text chapters and restores the supplied defaults. Built-in data blocks consume the saved `OverviewData`; arbitrary customer charts require an explicit contract extension, not HTML embedded in prose.

```tsx
const chapters = defaultChapters().map(chapter =>
  chapter.id === "summary"
    ? {...chapter, body: "本期共 {{totalEvents}} 筆。\n\n請補充分析結論。"}
    : chapter
);
<ReportsCenter
  adapter={reportsAdapter}
  sources={sources}
  defaults={{title:"期間分析報告", rangeDays:7, timeZone:"Asia/Taipei", chapters}}
  fontSrc="/fonts/NotoSansCJKtc-Regular.otf"
/>
```

`ReportsAdapter` requires list/create/get/delete. Implement optional `preview(input)` to enable the pre-save graphic/text preview; the template calls POST `/api/core/reports/preview`, which collects real authorized provider results without inserting a report. The preview is a point-in-time draft; saving collects a fresh snapshot, so data can change between those actions. Saved preview and download always use saved data. A failed draft request shows an error, never synthetic success. Reusing a saved report loads its editing fields; saving creates a new snapshot rather than updating the old one.

Allowlisted placeholders are `{{from}}`, `{{to}}`, `{{timezone}}`, `{{totalEvents}}` and `{{metric.ID}}`. Unknown numeric values remain unknown; an unrecognized placeholder displays an explicit unresolved marker. Values are resolved from the snapshot, with no expression execution. Browser chapters, PDF and narrative CSV rows share the same chapter resolution. PDF contains a cover/outline, editable prose, vector trend/category graphics, tables, Chinese text and page numbers. The trend preserves gaps and isolated points. JSON retains the saved structure including omitted chapters; CSV exports data and enabled narrative, not graphic layout or all source records.

Server input validates chapter IDs, kinds, lengths, uniqueness and at least one enabled chapter. Existing v1 snapshots without chapters retain their legacy PDF behavior; the browser adapts legacy narrative sections. No database migration is needed because snapshots are stored as JSON. Authorize downloads again, and keep the live provider unnecessary for existing snapshots.

## Usage adapter recipe

`ModelSettings` accepts `renderUsage(model)`. The template supplies:

```tsx
<ModelSettings renderUsage={model =>
  <ModelUsageCard key={model.id} modelId={model.id} version={model.version} />
} />
```

The card's default loader calls the administrator-only `/api/core/models/[id]/usage`. To reuse the display with a different backend, pass a stable `load(id, signal)` function. The data contract names status, provider, scope, unit, used, remaining, limit, unlimited, expiresAt, checkedAt and optional period. Unsupported has null amounts; failed loading shows an error. Never represent unavailable as zero or unlimited.

On the server set `CoreConfig.usageProvider`. `createTokenFleetUsageProvider(encryptionKey, fetcher?)` supports only `https://tokenfleet.ai`; it uses a fixed endpoint, timeout/response bounds, short-lived caching and concurrent request coalescing. It preserves API-defined quota units and shared-key scope. Other providers return unsupported unless a customer supplies another adapter. Per-run token/cost accounting is not implemented by this allowance API and must not be inferred from it. Tests inject fetch; no real provider call is needed for automated acceptance.

## Chat and Agent recipe

```tsx
<ChatWorkspace
  suggestions={[
    {category:"探索",title:"了解資料",description:"查看可用資料與能力",prompt:"請查看此專案提供的分析能力。"}
  ]}
  onConfigureModels={() => router.push("/settings/models")}
/>
```

Only provide the configuration callback to users permitted to configure models. Tool details start closed, remain closed when calls arrive and open on user action. Each assistant answer retains its own redacted trace and exposes an inspection action; the global toggle shows the selected answer or current/latest run. Partial/error/cancelled status remains visible without the panel. Rename/delete endpoints are owner-scoped and reject mutations during active execution in the documented single-process deployment.

The Web bridge signs a shared execution deadline and current request time context. Python honors the remaining budget and may summarize partial evidence once with tools disabled while retaining partial status. Cancellation and confirmation-required writes do not authorize more work. Customer prompts should specify available tools, source/evidence interpretation, trusted relative dates, unknown/partial data and untrusted tool text. Register tool names in both the Web allowlist and Agent registry; the backend still authorizes each invocation.

## Acceptance and limitations

Use synthetic providers and an isolated database. Check direct URLs, refresh/Back, query scope, raw completeness, entity attributes and paginated event lists. For reports test editing/order/omission, preview without persistence, PDF text and graphics, long Chinese content and saved export while the live provider is unavailable. For usage cover available/unsupported/failure, unlimited and shared-key units. For Chat test initial panel closure and per-answer trace selection. Review 1440/1920/390px and light/dark as applicable.

The source working examples are not customer business adapters. No unlimited raw export, generic asset inventory, per-run billing, durable Agent jobs or distributed cancellation is implied. Installation/build/browser and provider checks are distinct evidence; consult the platform verification record for what was actually executed.
