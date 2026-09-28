/** Version 1 uses inclusive `from`, exclusive `to`, expressed as ISO 8601 instants. */
export interface OverviewRange {
  from: string;
  to: string;
}
export interface OverviewQuery extends OverviewRange {
  sourceId?: string;
}
export interface OverviewSource {
  id: string;
  label: string;
}
export interface OverviewMetric {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  description?: string;
}
export interface OverviewTrendPoint {
  time: string;
  value: number | null;
}
export interface OverviewCategory {
  id: string;
  label: string;
  value: number;
}
/** `category` matches an OverviewCategory.id; labels are presentation metadata. */
export interface OverviewEvent {
  id: string;
  time: string;
  title: string;
  category: string;
  level?: string;
}
export interface OverviewData {
  version: 1;
  query: OverviewQuery;
  generatedAt: string;
  dataset: { kind: "synthetic" | "customer"; label: string };
  metrics: OverviewMetric[];
  trend: OverviewTrendPoint[];
  categories: OverviewCategory[];
  events: OverviewEvent[];
  /** Applies to aggregates. A shorter event list never implies that the full range was returned. */
  coverage: {
    status: "complete" | "partial" | "sampled";
    /** Exact matching count when known; null means unknown, never zero. */
    totalEvents: number | null;
    explanation?: string;
  };
}
/** Customer composition supplies transport and handles credentials/authorization. */
export interface OverviewAdapter {
  sources(signal?: AbortSignal): Promise<OverviewSource[]>;
  load(query: OverviewQuery, signal?: AbortSignal): Promise<OverviewData>;
}
