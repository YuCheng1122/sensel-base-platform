import type { ReportChapter, ReportSnapshot } from "./contracts";
export function defaultChapters(): ReportChapter[] {
  return [
    {id:"summary",kind:"text",title:"分析摘要",body:"本報告整理 {{from}} 至 {{to}} 的資料，顯示時區為 {{timezone}}。\n\n符合條件的事件共 {{totalEvents}} 筆。請在此補充觀察與結論。",enabled:true},
    {id:"metrics",kind:"metrics",title:"期間指標",body:"以下指標使用保存時的查詢結果。",enabled:true},
    {id:"trend",kind:"trend",title:"事件趨勢",body:"比較各時間區間的事件數量。",enabled:true},
    {id:"categories",kind:"categories",title:"分類統計",body:"各分類的保存數值與分布。",enabled:true},
    {id:"events",kind:"events",title:"事件樣本",body:"僅列出已保存的事件，不代表完整原始資料匯出。",enabled:true},
    {id:"conclusion",kind:"text",title:"結論與後續建議",body:"請依據上述證據補充結論與下一步。",enabled:true},
  ];
}
export function reportChapters(snapshot: ReportSnapshot): ReportChapter[] {
  return snapshot.chapters ?? [
    ...defaultChapters().filter(chapter => chapter.kind !== "text"),
    ...(snapshot.sections ?? []).map(section => ({id:section.id,kind:"text" as const,title:section.title,body:section.paragraphs.join("\n\n"),enabled:true})),
  ];
}
function resolveChapterText(body: string, snapshot: ReportSnapshot): string {
  const time = (value: string) => new Date(value).toLocaleString("zh-TW", {timeZone:snapshot.timeZone});
  const values: Record<string,string> = {from:time(snapshot.range.from),to:time(snapshot.range.to),timezone:snapshot.timeZone,totalEvents:snapshot.coverage.totalEvents?.toLocaleString("zh-TW") ?? "未知"};
  for (const metric of snapshot.data.metrics) values[`metric.${metric.id}`] = metric.value?.toLocaleString("zh-TW") ?? "未知";
  return body.replace(/\{\{([\w.-]+)\}\}/g, (placeholder, key: string) => Object.hasOwn(values,key) ? values[key] : `[未提供：${placeholder}]`);
}
export function resolvedChapters(snapshot: ReportSnapshot) {
  return reportChapters(snapshot).filter(chapter => chapter.enabled).map(chapter => ({...chapter,body:resolveChapterText(chapter.body,snapshot)}));
}
