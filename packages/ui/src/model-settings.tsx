"use client";
import type { ReactNode } from "react";
import { useEffect, useState, type FormEvent } from "react";
import { request, type Model } from "./api-client";
import { Notice, PageHeader } from "./primitives";
import { ModelEditor } from "./model-editor";
import { ModelCatalog } from "./model-catalog";
export function ModelSettings({renderUsage}: {renderUsage?: (model:Model)=>ReactNode} = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<Model[]>([]);
  const [editing, setEditing] = useState<Model | null>(null);
  const [provider, setProvider] = useState("openai-compatible");
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
      const saved = await request<{ item: Model }>("/models", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setSelectedId(saved.item.id);
      setEditing(null);
      setProvider("openai-compatible");
      formElement.reset();
      setNotice("模型設定已儲存。");
      try {
        await refresh();
      } catch {
        setError(
          "模型已儲存，但列表重新載入失敗。請重新整理確認，勿重複新增。",
        );
      }
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
    <div className="sensel-page">
      <PageHeader title="模型設定" />
      <div className="stack">
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <div className="model-settings-content">
          <ModelEditor
            editing={editing}
            provider={provider}
            busy={busy}
            setProvider={setProvider}
            onSubmit={save}
            onCancel={() => {
              setEditing(null);
              setProvider("openai-compatible");
            }}
          />
          <ModelCatalog
            renderUsage={renderUsage}
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            busy={busy}
            onEdit={(item) => {
              setEditing(item);
              setProvider(item.provider);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onTest={(item, mode) => void test(item, mode)}
          />
        </div>
      </div>
    </div>
  );
}
