import type { OverviewData, OverviewQuery, OverviewRange } from "./contracts";
const DAY = 86_400_000;
export function presetRange(days: number, now = Date.now()): OverviewRange {
  if (!Number.isFinite(days) || days <= 0 || days > 90)
    throw new Error("時間範圍須介於 0 至 90 天。");
  return {
    from: new Date(now - days * DAY).toISOString(),
    to: new Date(now).toISOString(),
  };
}
export function validateRange(range: OverviewRange): string | null {
  const from = Date.parse(range.from),
    to = Date.parse(range.to);
  const instant = /T.+(?:Z|[+-]\d{2}:\d{2})$/;
  if (
    !instant.test(range.from) ||
    !instant.test(range.to) ||
    !Number.isFinite(from) ||
    !Number.isFinite(to)
  )
    return "請填入有效且包含時區的起訖時間。";
  if (from >= to) return "起始時間必須早於結束時間。";
  if (to - from > 90 * DAY) return "每次查詢最多 90 天。";
  return null;
}
export function formatOverviewTime(
  iso: string,
  timeZone = "UTC",
  compact = false,
): string {
  const time = new Date(iso);
  if (!Number.isFinite(time.getTime())) return "時間未知";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    ...(!compact ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(time);
}
export function coverageDescription(data: OverviewData): string {
  const coverage = {
    complete: "完整聚合",
    partial: "部分資料",
    sampled: "抽樣資料",
  }[data.coverage.status];
  const total =
    data.coverage.totalEvents === null
      ? "符合條件總數未知"
      : `符合條件 ${data.coverage.totalEvents.toLocaleString("zh-TW")} 筆`;
  return `${coverage} · ${total} · 回傳事件 ${data.events.length.toLocaleString("zh-TW")} 筆`;
}
/** Reject mismatched responses; neither failed requests nor unknown counts become an empty result. */
export function assertOverviewData(
  data: OverviewData,
  query?: OverviewQuery,
): void {
  if (data.version !== 1 || validateRange(data.query))
    throw new Error("概覽資料版本或時間範圍不正確。");
  if (
    !["synthetic", "customer"].includes(data.dataset.kind) ||
    !data.dataset.label.trim() ||
    !Number.isFinite(Date.parse(data.generatedAt))
  )
    throw new Error("資料來源標示或產生時間不正確。");
  if (
    new Set(data.trend.map((item) => item.time)).size !== data.trend.length ||
    new Set(data.categories.map((item) => item.id)).size !==
      data.categories.length ||
    new Set(data.metrics.map((item) => item.id)).size !== data.metrics.length
  )
    throw new Error("聚合資料識別碼或時間區間重複。");
  if (
    query &&
    (Date.parse(data.query.from) !== Date.parse(query.from) ||
      Date.parse(data.query.to) !== Date.parse(query.to) ||
      (data.query.sourceId ?? "all") !== (query.sourceId ?? "all"))
  )
    throw new Error("回傳資料與目前查詢條件不一致。");
  if (!["complete", "partial", "sampled"].includes(data.coverage.status))
    throw new Error("資料涵蓋狀態不正確。");
  if (
    data.coverage.totalEvents !== null &&
    (!Number.isInteger(data.coverage.totalEvents) ||
      data.coverage.totalEvents < 0 ||
      data.coverage.totalEvents < data.events.length)
  )
    throw new Error("事件總數與回傳清單不一致。");
  if (
    data.metrics.some(
      (item) => item.value !== null && !Number.isFinite(item.value),
    ) ||
    data.trend.some(
      (item) =>
        !Number.isFinite(Date.parse(item.time)) ||
        (item.value !== null &&
          (!Number.isFinite(item.value) || item.value < 0)),
    ) ||
    data.categories.some(
      (item) => !Number.isFinite(item.value) || item.value < 0,
    )
  )
    throw new Error("圖表數值不正確；未知資料必須明確標示。");
  if (
    data.events.some(
      (item) =>
        !Number.isFinite(Date.parse(item.time)) ||
        Date.parse(item.time) < Date.parse(data.query.from) ||
        Date.parse(item.time) >= Date.parse(data.query.to),
    )
  )
    throw new Error("事件時間不在查詢範圍內。");
  if (new Set(data.events.map((item) => item.id)).size !== data.events.length)
    throw new Error("事件識別碼重複。");
}
