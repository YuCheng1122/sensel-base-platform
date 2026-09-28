import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { ReportSnapshot } from "./contracts";
import { ReportSummaryCharts } from "./report-summary-charts";

/** Source SnapshotPDF font registration and A4 chrome, decoupled from its event schema. */
export function registerReportFont(src: string): void {
  Font.register({ family: "SenseLReportCJK", src });
  Font.registerHyphenationCallback((word) => Array.from(word));
}
const styles = StyleSheet.create({
  page: {
    fontFamily: "SenseLReportCJK",
    fontSize: 9,
    lineHeight: 1.5,
    padding: 42,
    paddingTop: 58,
    paddingBottom: 56,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 42,
    right: 42,
    fontSize: 8,
    lineHeight: 1.5,
    color: "#64748b",
  },
  footer: {
    position: "absolute",
    top: 798,
    left: 42,
    right: 42,
    fontSize: 8,
    lineHeight: 1.5,
    color: "#64748b",
  },
  title: {
    fontSize: 26,
    lineHeight: 1.35,
    color: "#102a43",
    marginTop: 24,
    marginBottom: 20,
  },
  coverLabel: {
    fontSize: 11,
    color: "#4d7c0f",
    letterSpacing: 2,
    marginTop: 24,
  },
  overview: {
    marginVertical: 20,
    padding: 18,
    backgroundColor: "#f3f8e8",
    borderLeftWidth: 3,
    borderLeftColor: "#4d7c0f",
  },
  metric: {
    fontSize: 30,
    lineHeight: 1.4,
    color: "#102a43",
    marginVertical: 6,
  },
  heading: {
    fontSize: 15,
    lineHeight: 1.5,
    color: "#102a43",
    marginTop: 20,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  muted: { color: "#475569", fontSize: 9 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingVertical: 7,
  },
  cell: { width: "50%", paddingRight: 8 },
  record: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
});
const value = (number: number | null) =>
  number === null ? "未提供" : number.toLocaleString("en-US");
const coverageLabels = { complete: "完整", partial: "部分", sampled: "抽樣" };
function Chrome({ id }: { id: string }) {
  return (
    <>
      <Text fixed style={styles.header}>
        SenseL · 分析報告 · {id}
      </Text>
      <Text
        fixed
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `第 ${pageNumber} / ${totalPages} 頁`
        }
      />
    </>
  );
}
export function SnapshotPDF({ snapshot: s }: { snapshot: ReportSnapshot }) {
  const time = (value: string) =>
    new Intl.DateTimeFormat("zh-TW", {
      timeZone: s.timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  return (
    <Document
      title={s.title}
      author="SenseL"
      subject="已保存分析快照"
      language="zh-TW"
    >
      <Page size="A4" wrap style={styles.page}>
        <Chrome id={s.id} />
        <Text style={styles.coverLabel}>SENSEL · ANALYSIS REPORT</Text>
        <Text style={styles.title}>{s.title}</Text>
        <Text>
          {time(s.range.from)} ≤ 時間 &lt; {time(s.range.to)}
        </Text>
        <Text style={styles.muted}>報告顯示時區：{s.timeZone}</Text>
        <Text style={styles.muted}>
          資料來源：{s.source.label} · {s.data.dataset.label}
        </Text>
        <View style={styles.overview} wrap={false}>
          <Text>期間資料概況</Text>
          <Text style={styles.metric}>{value(s.coverage.totalEvents)}</Text>
          <Text>
            符合條件筆數 · 統計覆蓋：{coverageLabels[s.coverage.status]}
          </Text>
        </View>
        <Text>
          {s.coverage.explanation ?? "統計覆蓋以資料提供者保存的說明為準。"}
        </Text>
        <Text style={styles.muted}>
          保存明細 {s.data.events.length} 筆；明細不代表全部符合條件資料。
        </Text>
        <Text wrap={false} style={styles.heading}>
          報告內容
        </Text>
        <Text>
          期間指標、時間分布、分類統計、保存明細及客戶提供的文字段落。
        </Text>
        <Text style={[styles.muted, { marginTop: 24 }]}>
          建立時間：{time(s.createdAt)}
        </Text>
        <Text style={styles.muted}>資料擷取：{time(s.data.generatedAt)}</Text>
        <Text style={styles.muted}>
          快照格式：v{s.version}
          。後續來源變更不會重算本報告；下載內容僅使用此份已保存快照。
        </Text>
        {s.data.dataset.kind === "synthetic" && (
          <Text style={styles.muted}>合成示範資料；不是實際客戶分析結果。</Text>
        )}
      </Page>
      <Page size="A4" wrap style={styles.page}>
        <Chrome id={s.id} />
        <Text wrap={false} style={styles.heading} minPresenceAhead={50}>
          01 · 期間指標
        </Text>
        {s.data.metrics.map((metric) => (
          <View key={metric.id} style={styles.row}>
            <Text style={styles.cell}>{metric.label}</Text>
            <Text style={styles.cell}>
              {value(metric.value)} {metric.unit ?? ""}
              {metric.description ? ` · ${metric.description}` : ""}
            </Text>
          </View>
        ))}
        {!s.data.metrics.length && <Text>未保存指標。</Text>}
        <Text wrap={false} style={styles.heading} minPresenceAhead={50}>
          02 · 時間分布
        </Text>
        {s.data.trend.map((point, index) => (
          <View key={`${point.time}-${index}`} style={styles.row}>
            <Text style={styles.cell}>{time(point.time)}</Text>
            <Text style={styles.cell}>{value(point.value)}</Text>
          </View>
        ))}
        {!s.data.trend.length && <Text>未保存時間分布。</Text>}
        <Text wrap={false} style={styles.heading} minPresenceAhead={50}>
          03 · 分類統計
        </Text>
        <ReportSummaryCharts categories={s.data.categories} />
        {s.data.categories.map((category) => (
          <View key={category.id} style={styles.row}>
            <Text style={styles.cell}>{category.label}</Text>
            <Text style={styles.cell}>{value(category.value)}</Text>
          </View>
        ))}
        {!s.data.categories.length && <Text>未保存分類統計。</Text>}
        <Text wrap={false} style={styles.heading} minPresenceAhead={60}>
          04 · 保存明細
        </Text>
        <Text style={styles.muted}>
          以下僅包含快照保存的 {s.data.events.length}{" "}
          筆明細，不代表完整資料匯出。
        </Text>
        {s.data.events.map((event, index) => (
          <View key={event.id} style={styles.record}>
            <Text>
              {index + 1}. {event.title}
            </Text>
            <Text style={styles.muted}>
              時間：{time(event.time)} · 分類：{event.category}
              {event.level ? ` · 等級：${event.level}` : ""}
            </Text>
            <Text style={styles.muted}>ID：{event.id}</Text>
          </View>
        ))}
        {!s.data.events.length && (
          <Text>沒有已保存明細；未知資料量不會視為零。</Text>
        )}
        {(s.sections ?? []).map((section) => (
          <View key={section.id}>
            <Text wrap={false} style={styles.heading} minPresenceAhead={40}>
              {section.title}
            </Text>
            {section.paragraphs.map((text, index) => (
              <Text key={index} orphans={2} widows={2}>
                {text}
              </Text>
            ))}
          </View>
        ))}
        <Text wrap={false} style={styles.heading} minPresenceAhead={40}>
          報告範圍與追溯
        </Text>
        <Text style={styles.muted}>
          區間包含開始、不包含結束。使用者：{s.ownerId}；報告 ID：{s.id}。
        </Text>
        <Text style={styles.muted}>
          明細與指標由客戶資料提供者擷取；平台不推定領域含義或資料完整性。
        </Text>
      </Page>
    </Document>
  );
}
/** Called only after the download action; no PDF renderer in the initial UI entry. */
export async function reportPdfBlob(
  snapshot: ReportSnapshot,
  fontSrc: string,
): Promise<Blob> {
  registerReportFont(fontSrc);
  return pdf(<SnapshotPDF snapshot={snapshot} />).toBlob();
}
