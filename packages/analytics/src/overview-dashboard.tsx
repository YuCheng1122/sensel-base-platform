"use client";
import { useEffect, useState } from "react";
import { Database, Info } from "lucide-react";
import type { OverviewData } from "./contracts";
import { coverageDescription, formatOverviewTime } from "./overview-range";
import { MetricCards } from "./metric-cards";
import { TrendChart } from "./trend-chart";
import { CategoryDistribution } from "./category-distribution";
import { EventTable } from "./event-table";
/** Snapshot renderer: all charts/list derive solely from this data object; it never fetches. */
export function OverviewDashboard({
  data,
  timeZone = "UTC",
}: {
  data: OverviewData;
  timeZone?: string;
}) {
  const [category, setCategory] = useState<string>();
  useEffect(() => setCategory(undefined), [data]);
  return (
    <div className="overview-dashboard">
      <section
        className={`overview-coverage ${data.coverage.status !== "complete" ? "is-partial" : ""}`}
        aria-label="資料範圍與完整性"
      >
        <div>
          <Database size={16} />
          <strong>{data.dataset.label}</strong>
          <span className="overview-dataset-label">
            {data.dataset.kind === "synthetic" ? "合成示範資料" : "專案資料"}
          </span>
        </div>
        <p>{coverageDescription(data)}</p>
        <p className="overview-caption">
          {formatOverviewTime(data.query.from, timeZone)} —{" "}
          {formatOverviewTime(data.query.to, timeZone)}（{timeZone}） · 產生於{" "}
          {formatOverviewTime(data.generatedAt, timeZone)}
        </p>
        {data.coverage.explanation && (
          <p className="overview-coverage-note">
            <Info size={14} />
            {data.coverage.explanation}
          </p>
        )}
      </section>
      <MetricCards metrics={data.metrics} />
      <section className="overview-card">
        <header className="overview-section-heading">
          <h2>事件趨勢</h2>
          <span className="overview-caption">依目前來源與時間範圍</span>
        </header>
        <TrendChart points={data.trend} timeZone={timeZone} />
      </section>
      <section className="overview-card">
        <header className="overview-section-heading">
          <h2>事件分佈</h2>
          <span className="overview-caption">
            點選分類只篩選下方回傳清單，聚合範圍保持不變。
          </span>
        </header>
        <CategoryDistribution
          categories={data.categories}
          onSelect={(item) => setCategory(item.id)}
        />
      </section>
      <EventTable
        key={`${data.query.from}-${data.query.to}-${data.query.sourceId ?? "all"}-${category ?? "all"}`}
        events={data.events}
        totalEvents={data.coverage.totalEvents}
        timeZone={timeZone}
        category={category}
        categories={data.categories}
        onClearCategory={() => setCategory(undefined)}
      />
    </div>
  );
}
