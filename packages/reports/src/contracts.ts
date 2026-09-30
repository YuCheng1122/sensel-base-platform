import type {
  OverviewData,
  OverviewRange,
  OverviewSource,
} from "@sensel/analytics/contracts";

export interface ReportChapter {
  id: string;
  kind: "text" | "metrics" | "trend" | "categories" | "events";
  title: string;
  body: string;
  enabled: boolean;
}
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
  chapters?: ReportChapter[];
}
export interface CreateReportInput {
  chapters?: ReportChapter[];
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
  preview?(input: CreateReportInput): Promise<ReportSnapshot>;
  create(input: CreateReportInput): Promise<ReportSnapshot>;
  get(id: string, signal?: AbortSignal): Promise<ReportSnapshot>;
  delete(id: string): Promise<void>;
}
export interface ReportsDefaults {
  chapters?: ReportChapter[];
  title: string;
  rangeDays: number;
  timeZone: string;
}
