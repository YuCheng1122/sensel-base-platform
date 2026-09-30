"use client";
import { MetricCards, TrendChart, CategoryDistribution } from "@sensel/analytics";
import type { ReportSnapshot } from "./contracts";
import { resolvedChapters } from "./report-document";
export function ReportChapters({snapshot}: {snapshot: ReportSnapshot}) {
  return <>{resolvedChapters(snapshot).map((chapter,index) => <section className="report-outline-preview" key={chapter.id}>
    <h2>{index+1}. {chapter.title}</h2>
    {chapter.body.split(/\n\s*\n/).filter(Boolean).map((paragraph,i) => <p className="report-paragraph" key={i}>{paragraph}</p>)}
    {chapter.kind === "metrics" && <MetricCards metrics={snapshot.data.metrics}/>}
    {chapter.kind === "trend" && <TrendChart points={snapshot.data.trend} timeZone={snapshot.timeZone}/>}
    {chapter.kind === "categories" && <><CategoryDistribution categories={[...snapshot.data.categories].sort((a,b)=>b.value-a.value).slice(0,8)}/><p>圖表呈現最高 8 個分類；下表保留全部分類。</p><div className="overview-table-scroll"><table><thead><tr><th>分類</th><th>數值</th></tr></thead><tbody>{snapshot.data.categories.map(c=><tr key={c.id}><td>{c.label}</td><td>{c.value.toLocaleString()}</td></tr>)}</tbody></table></div></>}
    {chapter.kind === "events" && <div className="overview-table-scroll"><table><thead><tr><th>時間（{snapshot.timeZone}）</th><th>事件</th><th>分類</th></tr></thead><tbody>{snapshot.data.events.map(event=><tr key={event.id}><td>{new Date(event.time).toLocaleString("zh-TW",{timeZone:snapshot.timeZone})}</td><td>{event.title}</td><td>{snapshot.data.categories.find(c=>c.id===event.category)?.label ?? event.category}</td></tr>)}</tbody></table>{!snapshot.data.events.length && <p>沒有已保存事件。</p>}</div>}
  </section>)}</>;
}
