"use client";
import { useState } from "react";
import { Button, Notice } from "@sensel/ui";
import type { ReportSnapshot, ReportsAdapter } from "./contracts";
import {
  downloadBlob,
  reportCsv,
  reportFilename,
  reportJson,
} from "./report-exports";

export function ReportDownloads({
  snapshot,
  adapter,
  fontSrc,
}: {
  snapshot: ReportSnapshot;
  adapter: ReportsAdapter;
  fontSrc: string;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function download(format: "json" | "csv" | "pdf") {
    setBusy(format);
    setError("");
    try {
      // Re-check current ownership/permissions through the backend before exporting.
      const current = await adapter.get(snapshot.id);
      if (current.id !== snapshot.id)
        throw new Error("報告識別不一致，請重新載入。");
      const blob =
        format === "pdf"
          ? await (
              await import("./snapshot-pdf")
            ).reportPdfBlob(current, fontSrc)
          : new Blob(
              [format === "csv" ? reportCsv(current) : reportJson(current)],
              {
                type:
                  format === "csv"
                    ? "text/csv;charset=utf-8"
                    : "application/json;charset=utf-8",
              },
            );
      downloadBlob(blob, reportFilename(current, format));
    } catch {
      setError(
        "下載失敗，請確認目前報告權限與字型資源後重試。未產生成功下載。",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="report-downloads">
      <div className="row">
        {(["pdf", "json", "csv"] as const).map((format) => (
          <Button
            key={format}
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={() => void download(format)}
          >
            {busy === format ? "準備中…" : `下載 ${format.toUpperCase()}`}
          </Button>
        ))}
      </div>
      {error && <Notice error>{error}</Notice>}
      <p className="muted">
        CSV 包含已保存指標、趨勢、分類及明細；不是原始資料全量匯出。
      </p>
    </div>
  );
}
