"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { request } from "./api-client";
import { Button, Field, Notice, PageHeader } from "./primitives";
import { SettingsAudit } from "./settings-audit";

export interface PlatformSettingsData {
  name: string;
  timezone: string;
  reportTitle: string;
  defaultRangeDays: number;
  version: number;
}

export function PlatformSettings({
  onSaved,
}: {
  onSaved?: (settings: PlatformSettingsData) => void;
}) {
  const [settings, setSettings] = useState<PlatformSettingsData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [auditRevision, setAuditRevision] = useState(0);
  const [formRevision, setFormRevision] = useState(0);
  const pendingLoad = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    pendingLoad.current?.abort();
    const controller = new AbortController();
    pendingLoad.current = controller;
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await request<{ item: PlatformSettingsData }>(
        "/settings",
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) {
        setSettings(result.item);
        setFormRevision((value) => value + 1);
      }
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "無法載入設定。");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => pendingLoad.current?.abort();
  }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{ item: PlatformSettingsData }>(
        "/settings",
        {
          method: "PATCH",
          body: JSON.stringify({
            name: form.get("name"),
            timezone: form.get("timezone"),
            reportTitle: form.get("reportTitle"),
            defaultRangeDays: Number(form.get("defaultRangeDays")),
            expectedVersion: settings.version,
          }),
        },
      );
      setSettings(result.item);
      onSaved?.(result.item);
      setAuditRevision((value) => value + 1);
      setNotice("平台設定已儲存。新建立的報告會使用新預設，既有快照保持不變。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "無法儲存設定。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="平台設定">
        <Button variant="secondary" disabled={busy} onClick={() => void load()}>
          重新載入設定
        </Button>
      </PageHeader>
      <div className="stack">
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        {!settings ? (
          <p role="status">{error ? "設定未載入，請重試。" : "載入設定…"}</p>
        ) : (
          <form
            className="panel settings-form-grid"
            key={`${settings.version}-${formRevision}`}
            onSubmit={save}
          >
            <h2 className="settings-form-wide">SenseL 共用設定</h2>
            <Field label="平台名稱">
              <input
                name="name"
                defaultValue={settings.name}
                required
                maxLength={100}
                disabled={busy}
              />
            </Field>
            <Field label="顯示時區">
              <input
                name="timezone"
                defaultValue={settings.timezone}
                required
                maxLength={100}
                placeholder="Asia/Taipei"
                disabled={busy}
              />
            </Field>
            <Field label="預設報告標題">
              <input
                name="reportTitle"
                defaultValue={settings.reportTitle}
                required
                maxLength={200}
                disabled={busy}
              />
            </Field>
            <Field label="預設查詢天數">
              <input
                name="defaultRangeDays"
                type="number"
                min={1}
                max={90}
                defaultValue={settings.defaultRangeDays}
                required
                disabled={busy}
              />
            </Field>
            <p className="muted settings-form-wide">
              時區使用 IANA 名稱，例如 Asia/Taipei 或
              UTC。此設定影響顯示；查詢起訖以明確的 UTC 時間保存。
            </p>
            <div className="row settings-form-wide">
              <Button disabled={busy}>
                {busy ? "儲存中…" : "儲存平台設定"}
              </Button>
              <small>版本 {settings.version}</small>
            </div>
          </form>
        )}
        <SettingsAudit revision={auditRevision} />
      </div>
    </>
  );
}
