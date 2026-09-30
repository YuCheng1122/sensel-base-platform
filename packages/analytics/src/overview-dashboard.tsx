"use client";
import { useEffect, useState, type ReactNode } from "react";
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
  timeZone = "UTC", renderPanels, eventHref,
}: {
  renderPanels?: (data:OverviewData)=>ReactNode;
  eventHref?: (id:string)=>string;
  data: OverviewData;
  timeZone?: string;
}) {
  const [category, setCategory] = useState<string>();
  useEffect(() => setCategory(undefined), [data]);
  const levelCounts = new Map<string, number>();
  for (const event of data.events) {
    const level = event.level || "";
    levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
  }
  const levels = [...levelCounts].map(([level, value]) => ({
    id: level ? `level:${level}` : "missing-level",
    label: level || "未提供",
    value,
  }));
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
          <span className="overview-caption">{timeZone}</span>
        </header>
        <TrendChart points={data.trend} timeZone={timeZone} />
      </section>
      <div className="overview-distribution-grid">
        <section className="overview-card" aria-label="事件分佈">
          <header className="overview-section-heading">
            <h2>事件分佈</h2>
            <span className="overview-caption">點選分類篩選下方清單</span>
          </header>
          <CategoryDistribution
            categories={data.categories}
            onSelect={(item) => setCategory(item.id)}
          />
        </section>
        <section className="overview-card" aria-label="最近事件等級">
          <header className="overview-section-heading">
            <h2>最近事件等級</h2>
            <span className="overview-caption">
              僅回傳清單 {data.events.length.toLocaleString("zh-TW")} 筆
            </span>
          </header>
          <CategoryDistribution
            categories={levels}
            subtotalLabel="回傳事件小計"
          />
        </section>
      </div>
      {renderPanels?.(data)}
      <EventTable
        eventHref={eventHref}
        key={`${data.query.from}-${data.query.to}-${data.query.sourceId ?? "all"}`}
        events={data.events}
        totalEvents={data.coverage.totalEvents}
        timeZone={timeZone}
        category={category}
        categories={data.categories}
        onCategoryChange={setCategory}
        onClearCategory={() => setCategory(undefined)}
      />
    </div>
  );
}
