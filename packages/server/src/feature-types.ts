import type {
  OverviewData,
  OverviewQuery,
  OverviewSource,
} from "@sensel/analytics/contracts";
import type { ReportSnapshot, ReportSummary } from "@sensel/reports/contracts";
import type { User } from "./types";
export type AnalysisActor = Pick<User, "id" | "role" | "groupIds">;
export interface AnalysisProvider {
  sources(actor: AnalysisActor): Promise<OverviewSource[]>;
  collect(input: {
    actor: AnalysisActor;
    query: OverviewQuery;
  }): Promise<OverviewData>;
}
export interface PlatformSettings {
  name: string;
  timezone: string;
  reportTitle: string;
  defaultRangeDays: number;
  version: number;
}
export interface SettingsAudit {
  id: string;
  actorId: string;
  createdAt: string;
  before: PlatformSettings;
  after: PlatformSettings;
}
export interface FeatureStore {
  settings(): Promise<PlatformSettings>;
  saveSettings(
    actorId: string,
    input: Omit<PlatformSettings, "version"> & { expectedVersion: number },
  ): Promise<PlatformSettings>;
  settingsAudit(
    actorId: string,
    cursor?: string,
  ): Promise<{ items: SettingsAudit[]; nextCursor?: string }>;
  reports(
    ownerId: string,
    input: { query: string; page: number; pageSize: number },
  ): Promise<{
    items: ReportSummary[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  createReport(
    ownerId: string,
    snapshot: ReportSnapshot,
  ): Promise<ReportSnapshot>;
  report(ownerId: string, id: string): Promise<ReportSnapshot | null>;
  deleteReport(ownerId: string, id: string): Promise<boolean>;
}
export const defaultPlatformSettings: PlatformSettings = {
  name: "Avocado SenseL",
  timezone: "UTC",
  reportTitle: "分析報告",
  defaultRangeDays: 7,
  version: 1,
};
