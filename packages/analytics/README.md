# @sensel/analytics

Reusable event overview and the charts it actually uses. The package preserves the source overview's heading/filter hierarchy, equal metric cards, 256px trend, horizontal category bars, and shared event-list destination. Its page now uses the shared `@sensel/ui` `.sensel-page` container: a centered 1280px maximum including 24px desktop or 16px mobile padding, matching reports and settings. It does not include vendor cards, SOC severity rules, investigation, correlation, or tuning workflows.

## Interactive overview

```tsx
import { EventOverview, type OverviewAdapter } from '@sensel/analytics';
import '@sensel/ui/styles.css';
import '@sensel/analytics/styles.css';

const adapter: OverviewAdapter = {
  async sources(signal) {
    const response = await fetch('/api/core/overview/sources', { signal });
    if (!response.ok) throw new Error('Cannot load sources');
    return (await response.json()).items;
  },
  async load(query, signal) {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.sourceId) params.set('sourceId', query.sourceId);
    const response = await fetch(`/api/core/overview?${params}`, { signal });
    if (!response.ok) throw new Error('Cannot load overview');
    return (await response.json()).item;
  },
};

<EventOverview adapter={adapter} defaultRangeDays={7} timeZone="Asia/Taipei" />
```

Keep the adapter reference stable. The customer supplies transport, credentials and source authorization; the shared package never imports a Prisma client, Elasticsearch adapter, customer alias or server module. Source choices are loaded first. Only advertised source IDs can be queried; `all` is available only if the provider explicitly advertises it. An empty source list and a source-load failure are distinct states. Scope changes abort old work and ignore late results; failed requests never appear as zero events.

`initialQuery` and `title` are optional. Presets resolve to absolute timestamps once on selection. Custom inputs explicitly use UTC, while display uses `timeZone`; the range is `[from,to)`, positive and at most 90 days. Root composition can initialize defaults from project settings.

## Snapshot/chart reuse

`OverviewDashboard({data,timeZone})` renders a supplied `OverviewData` snapshot without fetching. Reports can reuse it without drifting to current data. It includes local, clearly labeled list filtering; these controls do not change aggregate charts or fetch broader data.

Also exported and consumed by the overview: `MetricCards`, `TrendChart`, `CategoryDistribution`, `EventTable` and `TimeRangePicker`. Trend is the source-style Recharts line chart with a text table, explicit timezone and null gaps. Horizontal distribution bars retain the source presentation; their percentages use the returned category subtotal, not an invented whole-dataset denominator. No unused chart catalog or duplicate renderer is included. Chart animation is disabled for deterministic report rendering and reduced-motion compatibility.

## Data contract and completeness

Import shared DTOs from **`@sensel/analytics/contracts`**, a pure TypeScript entry without React, chart or browser imports. `OverviewData.version` is 1. The backend and report snapshot use the same contract.

- `dataset.kind` is `synthetic` or `customer`; synthetic data is visibly labeled.
- `coverage.status` describes aggregate coverage: `complete`, `partial`, or `sampled`.
- `coverage.totalEvents` is the exact matching count when known, or `null` when unknown.
- `events.length` is the returned list size. It may be smaller than the full count. Search, category selection and paging operate only on these returned events and say so explicitly.
- `OverviewEvent.category` matches a category ID; labels come from `categories`.
- Unknown metrics/trend values remain `null`, rendered as unknown or a gap. They are never changed to zero.
- Category and trend values must be finite/nonnegative. Response range/source, duplicate IDs/buckets and impossible list counts are checked before interactive rendering.

Providers own aggregation, time bucketing, ordering, limits and access policies. The UI does not normalize arbitrary storage engines into a single query language. Optional event `level` is displayed as supplied, without assuming SOC severity semantics.

## Validation

`npx tsx --test packages/analytics/tests/*.test.ts` checks range anchoring, coverage, mismatched scopes, half-open event times, unknowns and advertised-source selection. Root typecheck/lint include the package. Browser verification needs a consuming application and the isolated sample provider. This README does not claim a live customer-data integration.
