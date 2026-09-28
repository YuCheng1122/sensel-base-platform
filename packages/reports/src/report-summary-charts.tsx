import { G, Rect, Svg, Text, View } from "@react-pdf/renderer";
import type { OverviewCategory } from "@sensel/analytics/contracts";

/** Source vector-bar geometry, with generic categories and an explicit visual limit. */
export function ReportSummaryCharts({
  categories,
}: {
  categories: OverviewCategory[];
}) {
  const rows = [...categories].sort((a, b) => b.value - a.value).slice(0, 8);
  const max = Math.max(...rows.map((row) => row.value), 1);
  if (!rows.length) return null;
  return (
    <View
      wrap={false}
      style={{ marginVertical: 12, padding: 12, backgroundColor: "#f8faf5" }}
    >
      <Text style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 8 }}>
        分類摘要
      </Text>
      {rows.some((row) => row.value > 0) ? (
        <Svg
          viewBox={`0 0 487 ${rows.length * 24}`}
          width="100%"
          height={rows.length * 24}
        >
          {rows.map((row, index) => (
            <G key={row.id}>
              <Text
                x={0}
                y={index * 24 + 13}
                style={{ fontFamily: "SenseLReportCJK", fontSize: 8 }}
              >
                {Array.from(row.label).length > 14
                  ? `${Array.from(row.label).slice(0, 14).join("")}…`
                  : row.label}
              </Text>
              <Rect
                x={128}
                y={index * 24 + 3}
                width={Math.max((row.value / max) * 260, row.value ? 1 : 0)}
                height={12}
                fill="#4d7c0f"
              />
              <Text
                x={405}
                y={index * 24 + 13}
                style={{ fontFamily: "SenseLReportCJK", fontSize: 8 }}
              >
                {row.value.toLocaleString("en-US")}
              </Text>
            </G>
          ))}
        </Svg>
      ) : (
        <Text style={{ fontSize: 9, color: "#64748b" }}>
          分類值皆為零，沒有可繪製的長條。
        </Text>
      )}
      <Text
        style={{ fontSize: 8, lineHeight: 1.5, color: "#64748b", marginTop: 8 }}
      >
        圖表呈現數值最高的 {rows.length}{" "}
        個分類；長名稱縮寫僅限圖表，下方表格保留全部分類與完整名稱。
      </Text>
    </View>
  );
}
