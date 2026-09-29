# Shared Event Overview, Reports and Settings

SenseL retains the navigation labels “事件概覽” and “報告下載” for customer reuse. Shared code owns presentation, query contracts, snapshot storage and exports; customers provide the actual data. Neither Elasticsearch nor an Nginx/PCAP parser is required or included.

## Package and File Responsibilities

| Location | Responsibility |
| --- | --- |
| `packages/analytics/src/contracts.ts` | Sources, ranges, metrics, trends, categories, events and coverage |
| `packages/analytics/src/event-overview.tsx` | Overview, authorized source selection, loading/error/empty states and refresh |
| `packages/analytics/src/overview-dashboard.tsx` | Shared metric/trend/category/event presentation, including saved reports |
| `packages/reports/src/contracts.ts` | Immutable snapshot and list/create/get/delete interfaces |
| `packages/reports/src/reports-center.tsx` | Capture form, saved list, search, paging and preview |
| `packages/reports/src/snapshot-pdf.tsx` | Chinese PDF, vector summary, details and page chrome |
| `packages/reports/src/report-exports.ts` | CSV/JSON and filenames; neutralizes spreadsheet formula prefixes |
| `packages/ui/src/platform-settings.tsx` | Platform name, time zone, report title and default range |
| `packages/ui/src/settings-audit.tsx` | Latest 50 platform setting changes; API also supports cursor paging |
| `packages/server/src/feature-handler.ts` | Authorized overview/report/settings APIs |
| `templates/project/web/src/server/prisma-feature-store.ts` | Customer-owned PostgreSQL persistence and settings transactions |
| `templates/project/web/src/server/synthetic-analysis-provider.ts` | Explicit synthetic sample, replaced for customer work |
| `templates/project/web/src/app/feature-adapters.ts` | Template HTTP composition for UI |

Layout and interaction hierarchy come from the source without SOC-specific fields or assumptions. Package READMEs and extraction-manifest.json record sources and differences.

## Customer Integration

Implement `AnalysisProvider` in customer `web/src/server/` and inject it through `coreConfig.analysisProvider`. Actor contains only `id`, `role`, `groupIds`; use these to restrict data access. Hiding a UI menu is not authorization.

- `sources(actor)` returns authorized source IDs/labels. `all` is not mandatory, and UI does not broaden scope automatically.
- `collect({actor, query})` queries ISO instants with `from <= time < to` and the requested source, returning `OverviewData`. Backend validates source, range, values, category IDs, counts and payload size.
- Nginx projects may aggregate requests from customer Prisma tables. PCAP projects may aggregate parsed results/protocols, but parsers, files and durable jobs stay customer-owned.
- `events[].category` references `categories[].id`; display text uses label. Use null for unknown values, never zero to imply confirmed absence.
- Coverage distinguishes complete, partial and sampled aggregation. The returned event list may be smaller than the total. Search/category filtering affects only returned events, not the full backend dataset.

See the runnable synthetic provider and [analytics package](../packages/analytics/README.md). The sample covers only the 14 UTC days preceding service startup. UI, snapshots and PDFs explicitly identify it as synthetic, not customer data.

## Report Guarantees and Limits

Creating a report collects once and saves query conditions, source, coverage, display time zone and complete snapshot in PostgreSQL. Reads, previews and JSON/CSV/PDF exports use saved content without querying the source again. New data requires another snapshot. Existing reports remain readable/downloadable if the source or platform defaults cannot load; only new capture is disabled.

Each download rechecks login and report ownership. Administrators do not automatically own other users' reports. PDF uses a local Noto Chinese font distributed with OFL licensing. Long text and pagination preserve all saved details; category summaries show at most eight items with a full category table below. CSV exports snapshot content, not all raw source data.

Queries span at most 90 days, return at most 1000 events and produce at most 5 MiB of snapshot data. Providers must bound query cost and describe truncation/sampling honestly. Reports are synchronous and bounded, not a background scheduler or bulk export engine.

SOC report revisions/narrative editing, automatic report mail, subscriptions, legacy data migration and PCAP parsing are not included. Customers may connect the shared [mail runtime](mail-service.md), but snapshot creation does not send mail and SMTP, attachments and subscription queues are not built in.

## Settings and Deployment

Authenticated users can read safe shared settings; only administrators can update them. Writes carry expectedVersion and save the next version with before/after audit data in one transaction. Concurrent writes at the same version allow one success; others return 409. This page displays platform settings audit only, not every account/model operation.

Migration `202609280002_feature_modules` adds platform settings, audit and report tables. Back up an existing instance, run `npm run db:migrate` using the matching migration image, then replace Web. Do not reset or bootstrap over accounts. These features do not require Agent changes.

New customer projects install six compatible npm packages and load `@sensel/ui/styles.css`, `@sensel/chat/styles.css`, `@sensel/analytics/styles.css` and `@sensel/reports/styles.css`. Preserve `public/fonts/` and its license; the generator includes these assets. Shared UI dimensions and typography are defined in [DESIGN.md](../DESIGN.md), not separate chart-specific page widths.

Overview, reports and settings use the shared 1280px page frame and shared Sans/Mono font tokens. The source-style time-range popover is bounded to 512px and the viewport, with presets and custom UTC inputs. Keep these values authoritative in [DESIGN.md](../DESIGN.md); [frontend skills](frontend-skills.md) provide portable implementation/review guidance. PDF retains its separately embedded CJK font.
