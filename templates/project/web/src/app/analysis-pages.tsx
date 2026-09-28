"use client";
import { useEffect, useState } from "react";
import { EventOverview } from "@sensel/analytics";
import type { OverviewSource } from "@sensel/analytics/contracts";
import { ReportsCenter } from "@sensel/reports";
import { Button, Notice, type PlatformSettingsData } from "@sensel/ui";
import { overviewAdapter, reportsAdapter } from "./feature-adapters";
export function AnalysisPages({
  active,
  settings,
}: {
  active: "overview" | "reports";
  settings: PlatformSettingsData | null;
}) {
  const [sources, setSources] = useState<OverviewSource[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (active !== "reports") return;
    const controller = new AbortController();
    setError("");
    setSources(null);
    overviewAdapter
      .sources(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setSources(items);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "無法載入資料來源。",
          );
      });
    return () => controller.abort();
  }, [active, retry]);
  if (active === "overview")
    return (
      <EventOverview
        adapter={overviewAdapter}
        defaultRangeDays={settings?.defaultRangeDays}
        timeZone={settings?.timezone}
      />
    );
  return (
    <>
      {error && (
        <div className="stack">
          <Notice error>{error}。仍可開啟與下載既有報告。</Notice>
          <Button onClick={() => setRetry((value) => value + 1)}>
            重試載入報告來源
          </Button>
        </div>
      )}
      {!sources && !error && <p role="status">載入報告來源…</p>}
      <ReportsCenter
        adapter={reportsAdapter}
        captureEnabled={Boolean(settings && sources && !error)}
        sources={settings ? (sources ?? []) : []}
        defaults={
          settings
            ? {
                title: settings.reportTitle,
                rangeDays: settings.defaultRangeDays,
                timeZone: settings.timezone,
              }
            : undefined
        }
      />
    </>
  );
}
