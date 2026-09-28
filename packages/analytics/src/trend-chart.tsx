"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverviewTrendPoint } from "./contracts";
import { formatOverviewTime } from "./overview-range";
export function TrendChart({
  points,
  timeZone = "UTC",
  label = "事件量",
  height = 256,
}: {
  points: OverviewTrendPoint[];
  timeZone?: string;
  label?: string;
  height?: number;
}) {
  if (!points.length)
    return <p className="overview-empty">選取期間內沒有可繪製的資料。</p>;
  return (
    <figure className="overview-trend">
      <div
        role="img"
        aria-label={`${label}趨勢，時區 ${timeZone}`}
        style={{ height, minWidth: 0 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ left: 4, right: 12, top: 8 }}
            accessibilityLayer
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="time"
              tickFormatter={(value) =>
                formatOverviewTime(String(value), timeZone, true)
              }
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              stroke="var(--muted-foreground)"
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              allowDecimals={false}
              tickFormatter={(value: number) => value.toLocaleString("zh-TW")}
              stroke="var(--muted-foreground)"
              fontSize={12}
            />
            <Tooltip
              labelFormatter={(value) =>
                formatOverviewTime(String(value), timeZone)
              }
              formatter={(value: number) => [
                value.toLocaleString("zh-TW"),
                label,
              ]}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={label}
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={points.length === 1 ? { r: 3 } : false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="overview-caption">
        {label} · {timeZone} · 缺值保留斷點，不補為零。
      </figcaption>
      <details className="overview-data-table">
        <summary>以表格檢視趨勢數值</summary>
        <div className="overview-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">區間起點（{timeZone}）</th>
                <th scope="col">{label}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.time}>
                  <td>{formatOverviewTime(point.time, timeZone)}</td>
                  <td>
                    {point.value === null
                      ? "未知"
                      : point.value.toLocaleString("zh-TW")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
