import type { AnalysisProvider } from "@sensel/server";
import type { OverviewEvent } from "@sensel/analytics/contracts";
const hour = 3600000,
  day = 24 * hour;
/** Explicit synthetic project adapter. Replace this file with authorized customer queries. */
export function createSyntheticAnalysisProvider(
  now = new Date(),
): AnalysisProvider {
  const {sources,rows} = syntheticDataset(now);
  return {
    async sources() {
      return sources.map((source) => ({ ...source }));
    },
    async collect({ query }) {
      const from = Date.parse(query.from),
        to = Date.parse(query.to);
      const filtered = rows.filter(
        (row) =>
          Date.parse(row.time) >= from &&
          Date.parse(row.time) < to &&
          (!query.sourceId ||
            query.sourceId === "all" ||
            row.sourceId === query.sourceId),
      );
      const trend = [];
      for (
        let start = from;
        start < to;
        start = Math.floor(start / day) * day + day
      ) {
        const end = Math.min(Math.floor(start / day) * day + day, to);
        trend.push({
          time: new Date(start).toISOString(),
          value: filtered.filter(
            (row) =>
              Date.parse(row.time) >= start && Date.parse(row.time) < end,
          ).length,
        });
      }
      const categories = [...new Set(rows.map((row) => row.category))].map(
        (label, index) => ({
          id: `category-${index}`,
          label,
          value: filtered.filter((row) => row.category === label).length,
        }),
      );
      const events: OverviewEvent[] = filtered
        .slice(-50)
        .reverse()
        .map(({ sourceId: _sourceId, ...row }) => ({
          ...row,
          category: categories.find(
            (category) => category.label === row.category,
          )!.id,
        }));
      const errors = filtered.filter((row) => row.level === "error").length;
      return {
        version: 1,
        query: { ...query },
        generatedAt: new Date().toISOString(),
        dataset: { kind: "synthetic", label: "合成示範資料（非客戶資料）" },
        metrics: [
          {
            id: "events",
            label: "事件總數",
            value: filtered.length,
            unit: "筆",
          },
          {
            id: "sources",
            label: "有資料的來源",
            value: new Set(filtered.map((row) => row.sourceId)).size,
            unit: "個",
          },
          { id: "errors", label: "錯誤事件", value: errors, unit: "筆" },
          {
            id: "error-rate",
            label: "錯誤比例",
            value: filtered.length
              ? Math.round((errors / filtered.length) * 10000) / 100
              : null,
            unit: "%",
            description: "沒有符合事件時，不推算比例",
          },
        ],
        trend,
        categories,
        events,
        coverage: {
          status: "complete",
          totalEvents: filtered.length,
          explanation:
            "合成資料集僅包含服務啟動日前 14 個 UTC 日；統計完整涵蓋此資料集中符合篩選的事件，列表最多顯示最近 50 筆。",
        },
      };
    },
  };
}

export function syntheticDataset(now = new Date()) {
  const anchor = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const sources = [
    { id: "all", label: "全部示範來源" },
    { id: "sample-a", label: "示範來源 A" },
    { id: "sample-b", label: "示範來源 B" },
  ];
  const rows = Array.from({ length: 14 * 24 }, (_, index) => ({
    id: `synthetic-${index}`,
    time: new Date(anchor - (14 * 24 - index) * hour).toISOString(),
    sourceId: index % 2 ? "sample-a" : "sample-b",
    title: `合成示範事件 ${index + 1}`,
    category: ["工作執行", "請求處理", "系統通知"][index % 3]!,
    level: index % 17 === 0 ? "error" : index % 7 === 0 ? "warning" : "info",
  }));
  return {sources,rows};
}
