import {Document, Page, Text, View, Svg, Line, Polyline, Circle, StyleSheet} from "@react-pdf/renderer";
import type {ReportSnapshot} from "./contracts";
import {resolvedChapters} from "./report-document";
import {ReportSummaryCharts} from "./report-summary-charts";
const styles=StyleSheet.create({
  page:{fontFamily:"SenseLReportCJK",fontSize:9,lineHeight:1.6,padding:38,paddingBottom:60,color:"#23324a"},
  title:{fontSize:24,marginBottom:16},heading:{fontSize:15,marginTop:20,marginBottom:10},
  row:{flexDirection:"row",borderBottom:"0.5 solid #cbd5e1",paddingVertical:7},cell:{width:"50%",paddingRight:12},
  muted:{fontSize:8,color:"#475569"},footer:{position:"absolute",bottom:24,left:38,fontSize:8},
});
function Trend({snapshot:s}:{snapshot:ReportSnapshot}) {
  const points=s.data.trend, known=points.filter(p=>p.value!==null);
  if(!known.length) return <Text>此期間没有可繪製的已知數值。</Text>;
  const max=Math.max(1,...known.map(p=>p.value!));
  const groups: string[][]=[[]];
  const coordinates=points.map((p,i)=>({x:24+i/Math.max(1,points.length-1)*440,y:120-(p.value ?? 0)/max*100}));
  points.forEach((p,i)=>{if(p.value===null)groups.push([]);else groups.at(-1)!.push(`${coordinates[i].x},${coordinates[i].y}`);});
  return <View wrap={false}><Text>事件量 · {s.timeZone} · 最高 {Math.max(...known.map(p=>p.value!)).toLocaleString()} 筆／區間</Text><Svg width={480} height={140} viewBox="0 0 480 140"><Line x1={24} y1={120} x2={464} y2={120} stroke="#cbd5e1"/>{groups.filter(g=>g.length>1).map((g,i)=><Polyline key={i} points={g.join(" ")} stroke="#2563eb" strokeWidth={2} fill="none"/>)}{points.map((p,i)=>p.value!==null?<Circle key={i} cx={coordinates[i].x} cy={coordinates[i].y} r={2} fill="#2563eb"/>:null)}</Svg><Text style={styles.muted}>{points[0]?.time} — {points.at(-1)?.time}（UTC）</Text></View>;
}
export function ChapterPDF({snapshot:s}:{snapshot:ReportSnapshot}) {
  const chapters=resolvedChapters(s), time=(value:string)=>new Date(value).toLocaleString("zh-TW",{timeZone:s.timeZone});
  return <Document title={s.title} author="SenseL" language="zh-TW"><Page size="A4" style={styles.page} wrap>
    <Text style={styles.footer} fixed render={({pageNumber,totalPages})=>`SenseL · 第 ${pageNumber} / ${totalPages} 頁`}/>
    <Text style={styles.title}>{s.title}</Text><Text>{time(s.range.from)} — {time(s.range.to)}（{s.timeZone}）</Text>
    <Text>來源：{s.source.label} · {s.data.dataset.label}</Text>
    <Text>資料覆蓋：{({complete:"完整",partial:"部分",sampled:"抽樣"})[s.coverage.status]} · 符合條件：{s.coverage.totalEvents ?? "未知"}</Text>
    <Text>{s.coverage.explanation}</Text>{s.data.dataset.kind==="synthetic"&&<Text>合成示範資料，非客戶結果。</Text>}
    <Text style={styles.heading}>報告大綱</Text>{chapters.map((c,i)=><Text key={c.id}>{i+1}. {c.title}</Text>)}
    {chapters.map((c,i)=><View key={c.id} break={i===0}><Text style={styles.heading} minPresenceAhead={55}>{i+1}. {c.title}</Text>
      {c.body.split(/\n\s*\n/).filter(Boolean).map((p,j)=><Text key={j} style={{marginBottom:10}} orphans={2} widows={2}>{p}</Text>)}
      {c.kind==="metrics"&&s.data.metrics.map(m=><View key={m.id} style={styles.row}><Text style={styles.cell}>{m.label}</Text><Text style={styles.cell}>{m.value?.toLocaleString() ?? "未知"} {m.unit}</Text></View>)}
      {c.kind==="trend"&&<><Trend snapshot={s}/>{s.data.trend.map(p=><View style={styles.row} key={p.time}><Text style={styles.cell}>{time(p.time)}</Text><Text style={styles.cell}>{p.value?.toLocaleString() ?? "未知"}</Text></View>)}</>}
      {c.kind==="categories"&&<><ReportSummaryCharts categories={s.data.categories}/>{s.data.categories.map(row=><View style={styles.row} key={row.id}><Text style={styles.cell}>{row.label}</Text><Text style={styles.cell}>{row.value.toLocaleString()}</Text></View>)}</>}
      {c.kind==="events"&&<><Text>已保存 {s.data.events.length} 筆；並非完整原始資料匯出。</Text>{s.data.events.map(e=><View style={styles.row} key={e.id}><Text style={styles.cell}>{time(e.time)} · {e.id}</Text><Text style={styles.cell}>{e.title} · {s.data.categories.find(c=>c.id===e.category)?.label ?? e.category}</Text></View>)}</>}
    </View>)}
    <Text style={styles.heading}>保存範圍與追溯</Text><Text>{s.coverage.explanation}</Text><Text style={styles.muted}>快照 {s.id} · 保存 {time(s.createdAt)} · 資料擷取 {time(s.data.generatedAt)}</Text>
  </Page></Document>;
}
