import type {
  OverviewData,
  OverviewRange,
  OverviewSource,
} from "@sensel/analytics/contracts";

export interface ReportSection {
  id: string;
  title: string;
  paragraphs: string[];
}
/** Saved values are immutable. Changes require a new snapshot ID. */
export interface ReportSummary {
  version: 1;
  id: string;
  title: string;
  createdAt: string;
  ownerId: string;
  range: OverviewRange;
  timeZone: string;
  source: OverviewSource;
  coverage: OverviewData["coverage"];
}
export interface ReportSnapshot extends ReportSummary {
  data: OverviewData;
  sections?: ReportSection[];
}
export interface CreateReportInput {
  title: string;
  range: OverviewRange;
  sourceId?: string;
  timeZone?: string;
}
export interface ReportListQuery {
  query?: string;
  page: number;
  pageSize: number;
}
export interface ReportList {
  items: ReportSummary[];
  total: number;
  page: number;
  pageSize: number;
}
export interface ReportsAdapter {
  list(query: ReportListQuery, signal?: AbortSignal): Promise<ReportList>;
  create(input: CreateReportInput): Promise<ReportSnapshot>;
  get(id: string, signal?: AbortSignal): Promise<ReportSnapshot>;
  delete(id: string): Promise<void>;
}
export interface ReportsDefaults {
  title: string;
  rangeDays: number;
  timeZone: string;
}
