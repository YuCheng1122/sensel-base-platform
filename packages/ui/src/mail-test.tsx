"use client";
import { useState } from "react";
import type { MailDelivery, MailSettings } from "@sensel/mail/contracts";
import { request } from "./api-client";
import { Button, Field, Notice } from "./primitives";
import { SettingsDialog } from "./settings-dialog";
import { MailReceipt } from "./mail-receipt";
import { MailDeliveries } from "./mail-deliveries";
import { useMailOperation } from "./mail-operation";

export function MailTest({
  saved,
  dirty,
  actorId,
  onBusyChange,
}: {
  saved: MailSettings;
  dirty: boolean;
  actorId: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const { operation, ready, update, observe } = useMailOperation(
    actorId,
    saved.version,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<"send" | "new" | null>(null);
  const [revision, setRevision] = useState(0);
  const available =
    ready &&
    saved.enabled &&
    saved.allowedProviders.includes(saved.provider) &&
    (saved.provider === "fake" || saved.hasApiKey);
  async function send() {
    if (busy || operation.attempted) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    const attempted = { ...operation, attempted: true };
    update(attempted);
    try {
      const result = await request<{ item: MailDelivery }>("/mail/test", {
        method: "POST",
        body: JSON.stringify({
          to: operation.recipient.trim(),
          expectedVersion: saved.version,
          idempotencyKey: operation.key,
        }),
      });
      update({ ...attempted, receipt: result.item });
    } catch (cause) {
      setError(
        `${cause instanceof Error ? cause.message : "無法確認操作結果。"} 請先重新整理投遞紀錄；此操作識別碼已保留，不會自動重寄。`,
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
      setDialog(null);
      setRevision((value) => value + 1);
    }
  }
  return (
    <>
      <section className="panel mail-card" aria-label="測試寄件服務">
        <header>
          <h2>測試已保存的寄件服務</h2>
          <p>寄送一封固定內容的測試信。</p>
        </header>
        <div className="mail-summary">
          <p>
            寄件者：{saved.fromName} &lt;{saved.fromEmail || "未設定"}&gt;
          </p>
          <p>
            設定版本：v{saved.version} ·{" "}
            {saved.provider === "fake" ? "合成測試，不會真實寄信" : "Resend"}
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setDialog("send");
          }}
        >
          <Field label="測試收件者">
            <input
              type="email"
              required
              maxLength={320}
              disabled={!ready || busy || operation.attempted}
              value={operation.recipient}
              onChange={(event) => {
                update({
                  key: crypto.randomUUID(),
                  recipient: event.target.value,
                  version: saved.version,
                  attempted: false,
                });
                setError("");
              }}
            />
          </Field>
          {dirty && <p>請先保存或放棄設定變更。</p>}
          {!saved.enabled && <p>寄信服務尚未啟用，無法測試。</p>}
          <div className="row">
            <Button
              disabled={
                !available ||
                dirty ||
                busy ||
                operation.attempted ||
                !operation.recipient.trim()
              }
              type="submit"
            >
              {busy ? "正在要求寄送…" : "寄送測試信"}
            </Button>
            {operation.attempted && (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setDialog("new")}
              >
                開始另一筆測試
              </Button>
            )}
          </div>
        </form>
        {busy && (
          <p role="status">寄送處理中，尚未確認供應商接受。請勿重複提交。</p>
        )}
        {error && <Notice error>{error}</Notice>}
        {operation.receipt ? (
          <div className="mail-summary">
            <MailReceipt delivery={operation.receipt} />
          </div>
        ) : (
          operation.attempted &&
          !busy && (
            <Notice error>
              此操作結果尚未確認，可能已寄出。請核對投遞紀錄及信箱，勿直接重寄。
            </Notice>
          )
        )}
        {operation.attempted && (
          <p className="mail-meta">
            操作識別碼：<code>{operation.key}</code>
          </p>
        )}
      </section>
      <MailDeliveries revision={revision} onObserved={observe} />
      <SettingsDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        title={dialog === "new" ? "確認開始另一筆測試" : "確認測試寄送"}
        busy={busy}
      >
        <p>
          {dialog === "new"
            ? "請先核對上一筆投遞紀錄及信箱；結果未知時可能已寄出。建立新的操作可能造成重複郵件。"
            : `將使用已保存 v${saved.version} 設定，向 ${operation.recipient} 寄送一封固定測試信。`}
        </p>
        <p>
          {saved.provider === "fake"
            ? "目前使用合成供應商，不會寄出真實郵件。"
            : "Resend 寄送可能計入供應商用量；接受要求不代表已送達。"}
        </p>
        <div className="row">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setDialog(null)}
          >
            取消
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (dialog === "new") {
                update({
                  key: crypto.randomUUID(),
                  recipient: operation.recipient,
                  version: saved.version,
                  attempted: false,
                });
                setError("");
                setDialog(null);
              } else void send();
            }}
          >
            {dialog === "new" ? "已核對，建立新測試" : "確認寄送測試信"}
          </Button>
        </div>
      </SettingsDialog>
    </>
  );
}
