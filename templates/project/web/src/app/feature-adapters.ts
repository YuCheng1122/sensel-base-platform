import { request } from "@sensel/ui";
import type {
  OverviewAdapter,
  OverviewData,
  OverviewSource,
} from "@sensel/analytics/contracts";
import type {
  ReportsAdapter,
  ReportList,
  ReportSnapshot,
} from "@sensel/reports/contracts";
export const overviewAdapter: OverviewAdapter = {
  sources: async (signal) =>
    (
      await request<{ items: OverviewSource[] }>("/overview/sources", {
        signal,
      })
    ).items,
  load: async (query, signal) => {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.sourceId) params.set("sourceId", query.sourceId);
    return (
      await request<{ item: OverviewData }>(`/overview?${params}`, { signal })
    ).item;
  },
};
export const reportsAdapter: ReportsAdapter = {
  preview: async input => (await request<{item:ReportSnapshot}>("/reports/preview",{method:"POST",body:JSON.stringify(input)})).item,
  list: (query, signal) => {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
    });
    if (query.query) params.set("query", query.query);
    return request<ReportList>(`/reports?${params}`, { signal });
  },
  create: async (input) =>
    (
      await request<{ item: ReportSnapshot }>("/reports", {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).item,
  get: async (id, signal) =>
    (
      await request<{ item: ReportSnapshot }>(
        `/reports/${encodeURIComponent(id)}`,
        { signal },
      )
    ).item,
  delete: async (id) => {
    await request(`/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
