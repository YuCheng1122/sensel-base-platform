import type { OverviewMetric } from "./contracts";
export function MetricCards({ metrics }: { metrics: OverviewMetric[] }) {
  return (
    <div className="overview-metrics" aria-label="摘要指標">
      {metrics.map((metric) => (
        <section className="overview-metric" key={metric.id}>
          <h2>{metric.label}</h2>
          <p className="overview-metric-value">
            {metric.value === null
              ? "未知"
              : metric.value.toLocaleString("zh-TW")}
            <span>{metric.unit}</span>
          </p>
          {metric.description && (
            <p className="overview-caption">{metric.description}</p>
          )}
        </section>
      ))}
    </div>
  );
}
