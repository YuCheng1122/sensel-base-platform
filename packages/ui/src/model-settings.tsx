"use client";
import { useEffect, useState, type FormEvent } from "react";
import { request, type Model } from "./api-client";
import { Button, Field, Notice, PageHeader } from "./primitives";
export function ModelSettings() {
  const [items, setItems] = useState<Model[]>([]);
  const [editing, setEditing] = useState<Model | null>(null);
  const [provider, setProvider] = useState("fake");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setItems((await request<{ items: Model[] }>("/models")).items);
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setError("");
    setNotice("");
    const body: Record<string, unknown> = {
      name: form.get("name"),
      provider,
      model: form.get("model"),
      baseUrl: form.get("baseUrl") || "",
      timeoutSeconds: Number(form.get("timeoutSeconds")),
      maxOutputTokens: Number(form.get("maxOutputTokens")),
      enabled: form.get("enabled") === "on",
      isDefault: form.get("isDefault") === "on",
    };
    if (form.get("apiKey")) body.apiKey = form.get("apiKey");
    if (editing) {
      body.id = editing.id;
      body.expectedVersion = editing.version;
    }
    try {
      await request("/models", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setEditing(null);
      setProvider("fake");
      formElement.reset();
      await refresh();
      setNotice("模型設定已儲存。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function test(
    model: Model,
    mode: "connection" | "tools" = "connection",
  ) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await request<{
        item: { ok: boolean; message?: string; supportsTools?: boolean };
      }>(`/models/${model.id}/test`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      await refresh();
      if (!result.item.ok) {
        setError(result.item.message ?? "模型測試失敗。");
        return;
      }
      setNotice(
        result.item.message ??
          `連線${result.item.ok ? "成功" : "失敗"}；工具能力：${result.item.supportsTools ? "支援" : "未確認"}`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title="模型設定" />
      <div className="stack">
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <div className="split">
          <section
            className="panel table-wrap"
            tabIndex={0}
            aria-label="模型清單"
          >
            <table className="settings-table">
              <thead>
                <tr>
                  <th>模型</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      <br />
                      <small>
                        {item.provider} / {item.model}
                      </small>
                    </td>
                    <td>
                      {item.enabled ? "啟用" : "停用"}
                      {item.isDefault ? " · 預設" : ""}
                      <br />
                      <small>
                        金鑰：{item.hasApiKey ? "已設定" : "未設定"}
                      </small>
                      <br />
                      <small>
                        連線：
                        {item.testedVersion === item.version
                          ? "已驗證"
                          : "尚未驗證目前版本"}
                      </small>
                      <br />
                      <small>
                        工具能力：
                        {item.toolsTestedVersion !== item.version ||
                        item.toolsSupported === null
                          ? "尚未驗證目前版本"
                          : item.toolsSupported
                            ? "已驗證"
                            : "不支援"}
                      </small>
                    </td>
                    <td>
                      <div className="row">
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setEditing(item);
                            setProvider(item.provider);
                          }}
                        >
                          編輯 {item.name}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void test(item)}
                        >
                          測試 {item.name}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => void test(item, "tools")}
                        >
                          工具測試 {item.name}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!items.length && <p className="muted">尚無模型，請新增設定。</p>}
          </section>
          <form
            key={`${editing?.id ?? "new"}-${editing?.version ?? 0}`}
            className="panel stack"
            onSubmit={save}
          >
            <h2>{editing ? "編輯模型" : "新增模型"}</h2>
            <Field label="顯示名稱">
              <input name="name" defaultValue={editing?.name} required />
            </Field>
            <Field label="提供者">
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="fake">Fake（本地驗證）</option>
                <option value="openai-compatible">OpenAI compatible</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
              </select>
            </Field>
            <Field label="模型 ID">
              <input
                name="model"
                defaultValue={editing?.model ?? "fake-model"}
                required
              />
            </Field>
            {provider !== "fake" && (
              <>
                <Field label="API Base URL">
                  <input
                    name="baseUrl"
                    type="url"
                    defaultValue={editing?.baseUrl ?? ""}
                    placeholder="https://provider.example/v1"
                    required
                  />
                </Field>
                <Field label="API 金鑰（留空保留現有金鑰）">
                  <input
                    name="apiKey"
                    type="password"
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}
            <Field label="逾時秒數">
              <input
                name="timeoutSeconds"
                type="number"
                min={5}
                max={120}
                defaultValue={editing?.timeoutSeconds ?? 60}
                required
              />
            </Field>
            <Field label="輸出 token 上限">
              <input
                name="maxOutputTokens"
                type="number"
                min={128}
                max={16384}
                defaultValue={editing?.maxOutputTokens ?? 4096}
                required
              />
            </Field>
            <label className="check">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={editing?.enabled ?? true}
              />
              啟用
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={editing?.isDefault ?? false}
                disabled={
                  !editing ||
                  editing.testedVersion !== editing.version ||
                  editing.toolsTestedVersion !== editing.version ||
                  editing.toolsSupported !== true
                }
              />
              預設模型
            </label>
            <small>
              先儲存模型，再執行連線及工具測試；兩項通過後，重新編輯並設為預設。
            </small>
            <div className="row">
              <Button disabled={busy}>儲存</Button>
              {editing && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEditing(null);
                    setProvider("fake");
                  }}
                >
                  取消編輯
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
