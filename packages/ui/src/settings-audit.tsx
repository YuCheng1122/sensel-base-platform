"use client";
import { useEffect, useState } from "react";
import { request } from "./api-client";
import { Button, Notice } from "./primitives";
import type { PlatformSettingsData } from "./platform-settings";
interface AuditEntry {
  id: string;
  actorId: string;
  createdAt: string;
  before: PlatformSettingsData;
  after: PlatformSettingsData;
}
const fields = {
  name: "平台名稱",
  timezone: "顯示時區",
  reportTitle: "預設報告標題",
  defaultRangeDays: "預設查詢天數",
} as const;
export function SettingsAudit({ revision }: { revision: number }) {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    request<{ items: AuditEntry[] }>("/settings/audit", {
      signal: controller.signal,
    })
      .then((result) => {
        setItems(result.items);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "無法載入稽核紀錄。",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, refresh]);
  return (
    <section
      className="panel stack"
      aria-label="平台設定變更紀錄"
      aria-busy={loading}
    >
      <div className="page-header">
        <h2>平台設定變更紀錄</h2>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          更新紀錄
        </Button>
      </div>
      <p className="muted">顯示最近 50 筆平台設定變更。</p>
      {error ? (
        <Notice error>{error}</Notice>
      ) : loading ? (
        <p role="status">載入紀錄…</p>
      ) : !items.length ? (
        <p>尚無變更紀錄。</p>
      ) : (
        items.map((item) => (
          <article className="panel" key={item.id}>
            <strong>
              平台設定 v{item.before.version} → v{item.after.version}
            </strong>
            <p className="muted">
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString("zh-TW", {
                  timeZone: "UTC",
                  hour12: false,
                })}{" "}
                UTC
              </time>{" "}
              · 操作者 #{item.actorId}
            </p>
            <ul>
              {(Object.keys(fields) as Array<keyof typeof fields>)
                .filter((field) => item.before[field] !== item.after[field])
                .map((field) => (
                  <li key={field}>
                    {fields[field]}：{String(item.before[field])} →{" "}
                    {String(item.after[field])}
                  </li>
                ))}
            </ul>
          </article>
        ))
      )}
    </section>
  );
}
