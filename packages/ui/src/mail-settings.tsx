"use client";
import { useEffect, useState } from "react";
import type { MailSettings } from "@sensel/mail/contracts";
import { request } from "./api-client";
import { Button, Field, Notice, PageHeader } from "./primitives";
import { MailTest } from "./mail-test";

export function MailServiceSettings({ actorId }: { actorId: string }) {
  const [saved, setSaved] = useState<MailSettings | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    request<{ item: MailSettings }>("/mail/settings", { signal: abort.signal })
      .then((result) => {
        if (!abort.signal.aborted) setSaved(result.item);
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "無法載入寄件服務。",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision, actorId]);
  return (
    <div className="mail-settings">
      <PageHeader title="寄信服務" />
      {loading ? (
        <p role="status">載入寄信服務設定…</p>
      ) : error ? (
        <Notice error>
          {error}
          <Button
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            重試載入
          </Button>
        </Notice>
      ) : (
        saved && (
          <MailEditor
            key={`${actorId}-${revision}`}
            initial={saved}
            actorId={actorId}
            reload={() => setRevision((value) => value + 1)}
          />
        )
      )}
    </div>
  );
}
function MailEditor({
  initial,
  actorId,
  reload,
}: {
  initial: MailSettings;
  actorId: string;
  reload: () => void;
}) {
  const [saved, setSaved] = useState(initial);
  const [provider, setProvider] = useState(initial.provider);
  const [fromName, setFromName] = useState(initial.fromName);
  const [fromEmail, setFromEmail] = useState(initial.fromEmail);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty =
    provider !== saved.provider ||
    fromName !== saved.fromName ||
    fromEmail !== saved.fromEmail ||
    enabled !== saved.enabled ||
    apiKey.length > 0;
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { item } = await request<{ item: MailSettings }>("/mail/settings", {
        method: "PATCH",
        body: JSON.stringify({
          provider,
          fromName: fromName.trim(),
          fromEmail: fromEmail.trim(),
          enabled,
          expectedVersion: saved.version,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });
      setSaved(item);
      setProvider(item.provider);
      setFromName(item.fromName);
      setFromEmail(item.fromEmail);
      setEnabled(item.enabled);
      setApiKey("");
      setNotice("寄信服務設定已保存；尚未寄送測試信。");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "保存失敗，請重新載入並確認設定版本。",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel mail-card" aria-label="共用寄件服務設定">
        <header>
          <h2>
            共用寄件服務 · {saved.provider === "fake" ? "合成測試" : "Resend"}
          </h2>
          <p>金鑰加密保存；空白保留目前金鑰。保存設定不會寄出測試信。</p>
        </header>
        <dl className="mail-config-summary">
          <div>
            <dt>保存版本</dt>
            <dd>
              v{saved.version} · {saved.enabled ? "服務啟用" : "服務停用"}
            </dd>
          </div>
          <div>
            <dt>金鑰狀態</dt>
            <dd>
              {saved.hasApiKey ? "••••••••（已設定，不顯示內容）" : "未設定"}
            </dd>
          </div>
        </dl>
        <p className="mail-summary">
          Resend
          寄件者需使用已驗證的網域；此介面不代辦網域驗證。合成供應商僅在部署明確開放的開發／測試環境提供。
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy || testBusy} className="mail-fields">
            <Field label="寄信供應商">
              <select
                value={provider}
                onChange={(event) =>
                  setProvider(event.target.value as MailSettings["provider"])
                }
              >
                {!saved.allowedProviders.includes(provider) && (
                  <option value={provider} disabled>
                    目前供應商不可用
                  </option>
                )}
                {saved.allowedProviders.map((value) => (
                  <option key={value} value={value}>
                    {value === "fake" ? "合成測試（不寄信）" : "Resend"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="寄件者名稱">
              <input
                value={fromName}
                maxLength={120}
                onChange={(event) => setFromName(event.target.value)}
              />
            </Field>
            <Field label="寄件者電子郵件">
              <input
                type="email"
                required={enabled}
                value={fromEmail}
                maxLength={320}
                onChange={(event) => setFromEmail(event.target.value)}
                placeholder="alerts@example.com"
              />
            </Field>
            <Field label="更換 API Key（空白保留）">
              <input
                type="password"
                autoComplete="new-password"
                value={apiKey}
                maxLength={8192}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </Field>
            <label className="mail-enable">
              <input
                type="checkbox"
                role="switch"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              啟用寄信服務（儲存後生效）
            </label>
          </fieldset>
          {error && <Notice error>{error}</Notice>}
          {notice && <Notice>{notice}</Notice>}
          <div className="row">
            <Button
              type="submit"
              disabled={
                busy ||
                testBusy ||
                !dirty ||
                !saved.allowedProviders.includes(provider)
              }
            >
              {busy ? "保存中…" : "保存寄信服務設定"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || testBusy}
              onClick={reload}
            >
              重新載入（放棄未保存內容）
            </Button>
          </div>
        </form>
      </section>
      <MailTest
        key={saved.version}
        saved={saved}
        dirty={dirty || busy}
        actorId={actorId}
        onBusyChange={setTestBusy}
      />
    </>
  );
}
