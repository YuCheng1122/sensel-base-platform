"use client";
import { Bar, ComposedChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatOverviewTime } from "./overview-range";
export interface StackedPoint { time: string; values: Record<string, number | null> }
export function StackedTrendChart({ points, series, timeZone = "UTC", onSelect, mode = "stacked", label = "多序列趨勢" }: {
  label?: string;
  points: StackedPoint[];
  series: { key: string; label: string; color: string }[];
  timeZone?: string;
  mode?: "stacked" | "line";
  onSelect?: (time: string) => void;
}) {
  if (!points.length) return <p className="overview-empty">選取期間內沒有可繪製的資料。</p>;
  if(!series.length || points.every(point=>series.every(item=>point.values[item.key]==null))) return <p className="overview-empty">此期間的數值尚無法取得，無法繪製趨勢。</p>;
  const data = points.map(point => ({ ...point.values, time: point.time }));
  return <figure className="overview-trend">
    <div role="img" aria-label={`${label}，時區 ${timeZone}`} style={{ height: 240, minWidth: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 4, right: 12, top: 8 }} onClick={state => {if (onSelect && typeof state?.activeLabel === "string" && points.some(point => point.time === state.activeLabel)) onSelect(state.activeLabel);}} style={{cursor: onSelect ? "pointer" : undefined}} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="time" tickFormatter={value => formatOverviewTime(String(value), timeZone, true)} tickLine={false} axisLine={false} minTickGap={40} stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis allowDecimals={false} width={52} tickLine={false} axisLine={false} tickFormatter={(value: number) => value.toLocaleString("zh-TW", { notation: "compact" })} stroke="var(--muted-foreground)" fontSize={12} />
          <Tooltip labelFormatter={value => formatOverviewTime(String(value), timeZone)} formatter={(value: number) => value.toLocaleString("zh-TW")} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }} />
          {series.map(item => mode === "line"
            ? <Line key={item.key} dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} dot={{r:2}} connectNulls={false} isAnimationActive={false} />
            : <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} stackId="series" isAnimationActive={false} cursor={onSelect ? "pointer" : undefined} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <div className="overview-chart-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div>
    <details className="overview-data-table"><summary>以表格檢視趨勢數值</summary><div className="overview-table-scroll"><table><thead><tr><th>區間起點（{timeZone}）</th>{series.map(item => <th key={item.key}>{item.label}</th>)}</tr></thead><tbody>{points.map(point => <tr key={point.time}><td>{onSelect ? <button type="button" aria-label={`篩選此時段：${formatOverviewTime(point.time, timeZone)}`} onClick={() => onSelect(point.time)}>{formatOverviewTime(point.time, timeZone)}</button> : formatOverviewTime(point.time, timeZone)}</td>{series.map(item => <td key={item.key}>{point.values[item.key]?.toLocaleString("zh-TW") ?? "未知"}</td>)}</tr>)}</tbody></table></div></details>
  </figure>;
}
