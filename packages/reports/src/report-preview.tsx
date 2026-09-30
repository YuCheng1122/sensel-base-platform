"use client";
import { ReportChapters } from "./report-chapters";
import type { ReportSnapshot, ReportsAdapter } from "./contracts";
import { ReportDownloads } from "./report-downloads";
const coverage = { complete: "完整", partial: "部分", sampled: "抽樣" };
export function ReportPreview({
  snapshot,
  adapter,
  fontSrc,
}: {
  snapshot: ReportSnapshot;
  adapter: ReportsAdapter;
  fontSrc: string;
}) {
  const display = (value: string) =>
    new Intl.DateTimeFormat("zh-TW", {
      timeZone: snapshot.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <section className="panel report-preview" aria-label="報告快照預覽">
      <header>
        <div>
          <h2>{snapshot.title}</h2>
          <p className="muted">
            建立於 {display(snapshot.createdAt)} · 快照 v{snapshot.version}
          </p>
        </div>
      </header>
      <div className="report-meta">
        <p>資料來源：{snapshot.source.label}</p>
        <p>
          {display(snapshot.range.from)} ≤ 時間 &lt;{" "}
          {display(snapshot.range.to)}（{snapshot.timeZone}）
        </p>
        <p>
          統計覆蓋：{coverage[snapshot.coverage.status]} · 精確符合筆數：
          {snapshot.coverage.totalEvents === null
            ? "未知"
            : snapshot.coverage.totalEvents.toLocaleString()}
        </p>
        {snapshot.coverage.explanation && (
          <p>{snapshot.coverage.explanation}</p>
        )}
      </div>
      <ReportDownloads
        snapshot={snapshot}
        adapter={adapter}
        fontSrc={fontSrc}
      />
      <ReportChapters snapshot={snapshot}/>
      <details>
        <summary>快照追溯資訊</summary>
        <p>內容為已保存快照，不會重新查詢來源。明細僅呈現擷取時保存的資料。</p>
        <p>報告 ID：{snapshot.id}</p>
        <p>資料擷取：{snapshot.data.generatedAt}</p>
        <p>擁有者：{snapshot.ownerId}</p>
      </details>
    </section>
  );
}
