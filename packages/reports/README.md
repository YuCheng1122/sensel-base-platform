# @sensel/reports

Source-derived report capture, saved report library, immutable preview and JSON/CSV/PDF downloads. Data comes from a customer adapter; no domain query, Elasticsearch, raw log schema or customer evidence is bundled.

```tsx
import { ReportsCenter } from "@sensel/reports";
import "@sensel/reports/styles.css";
import "@sensel/analytics/styles.css";

<ReportsCenter
  adapter={reportsAdapter}
  sources={authorizedSources}
  defaults={{ title: "期間分析報告", rangeDays: 7, timeZone: "Asia/Taipei" }}
  fontSrc="/fonts/NotoSansCJKtc-Regular.otf"
/>;
```

Load defaults and authorized sources before mounting the form. Defaults initialize editable fields; changing props does not overwrite a user's draft. Sources are supplied by the project; the component does not invent an all-sources scope.

## Contracts and ownership

`@sensel/reports/contracts` is a types-only entry safe for backend imports. `ReportSnapshot` has format version 1, identity/owner metadata, UTC inclusive/exclusive range, saved display timezone, source, explicit coverage, shared `OverviewData`, and optional text sections. `ReportsAdapter` lists a paginated owner-visible library, creates a snapshot through a customer collector, gets a saved snapshot, and deletes it. There is no update operation: recapture creates another identity.

Backend adapters MUST authorize every operation, validate dates/timezone and limits, invoke the collector once on creation, persist the full snapshot and return stored data on get. Partial/sampled coverage is preserved; an unknown total remains null. Empty complete data is a valid snapshot. Snapshot preview reuses `OverviewDashboard`; it does not rerun live analysis queries. Downloads re-fetch the saved snapshot to recheck current authorization. Failed/ambiguous create or delete instructs the user to verify the library before retrying.

## Export behavior

- JSON contains the complete saved snapshot.
- CSV is a UTF-8 BOM, quoted, section-tagged rectangular dataset containing metadata, metrics, trend, categories, saved events and optional narrative paragraphs. Unknown numeric values stay empty. Cells beginning with spreadsheet formula/control prefixes are neutralized. This is saved-data export, not an unrestricted raw-log download.
- PDF is a genuine A4 document generated lazily by `@react-pdf/renderer`; its cover, metadata, fixed header/footer, summary and saved evidence hierarchy follows the source report. Long text wraps, CJK is embedded and all saved rows are rendered. A vector bar summary shows up to eight categories with explicit labeling; the adjacent table preserves every category and full label. No dashboard rasterization is used.

Copy the original `public/fonts/NotoSansCJKtc-Regular.otf`, `OFL.txt` and `README.md` into the customer public font directory unchanged. The font is SIL OFL 1.1 and requires its accompanying license when redistributed. The PDF entry accepts a same-origin URL in browsers or local path in tests. Missing fonts cause an explicit failed download, never a claimed successful file. No remote font CDN is used.

Public UI imports do not statically import the PDF renderer. `@sensel/reports/pdf` exports `SnapshotPDF`, `registerReportFont`, and `reportPdfBlob` for explicit custom consumers. `@sensel/reports/exports` contains CSV/JSON/filename utilities.

## Provenance and deliberate exclusions

Reviewed original `src/app/report-download/{ReportCenter,ReportCaptureForm,ReportSnapshotView}.tsx` and `src/components/report/SnapshotPDF.tsx`. Preserved capture card → saved library with selection/deletion/paging → snapshot preview → downloads, source PDF A4 geometry/chrome, font registration and character wrapping. Backend transport and schema were replaced with injected contracts; UI shares the platform's established components/tokens.

SOC vendors, severity/status/verdict filters, site/device scopes, event-ID conventions, investigation references, report revisions/narrative editing and source-specific evidence policy stay in the customer project. The first reusable format is not wire-compatible with the old security-report payload. Snapshot creation is bounded by the backend collector's limits; this package is not a durable report-job engine.

Tests: repository `tests/ui/reports.test.ts` verifies CSV injection handling, null preservation, snapshot fidelity and multi-page Chinese PDF rendering with synthetic data only.

設定或來源尚未就緒時傳入 `captureEnabled={false}`；建立表單會在就緒後才掛載並採用設定預設值，已保存報告的查閱與下載不受影響。
