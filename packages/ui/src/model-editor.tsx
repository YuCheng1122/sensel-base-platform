"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { Model } from "./api-client";
import { Button, Field } from "./primitives";
export function ModelEditor({
  editing,
  provider,
  busy,
  setProvider,
  onSubmit,
  onCancel,
}: {
  editing: Model | null;
  provider: string;
  busy: boolean;
  setProvider: (provider: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  useEffect(() => setIsDefault(editing?.isDefault ?? false), [editing]);
  return (
    <form
      key={`${editing?.id ?? "new"}-${editing?.version ?? 0}`}
      className="panel model-editor"
      onSubmit={onSubmit}
      onChange={(event) => {
        const target = event.target as HTMLInputElement | HTMLSelectElement;
        if (
          [
            "provider",
            "model",
            "baseUrl",
            "apiKey",
            "timeoutSeconds",
            "maxOutputTokens",
          ].includes(target.name) ||
          (target.name === "enabled" && !(target as HTMLInputElement).checked)
        )
          setIsDefault(false);
      }}
    >
      <h2 className="model-editor-wide">{editing ? "編輯模型" : "新增模型"}</h2>
      <Field label="顯示名稱">
        <input name="name" defaultValue={editing?.name} required />
      </Field>
      <Field label="提供者">
        <select
          name="provider"
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
          defaultValue={editing?.model ?? ""}
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
              required={provider === "openai-compatible"}
            />
          </Field>
          <Field label="API 金鑰（留空保留現有金鑰）">
            <input name="apiKey" type="password" autoComplete="new-password" />
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
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
          disabled={
            !editing ||
            editing.testedVersion !== editing.version ||
            editing.toolsTestedVersion !== editing.version ||
            editing.toolsSupported !== true
          }
        />
        預設模型
      </label>
      <small className="model-editor-wide">
        先儲存模型，再執行連線及工具測試；兩項通過後，重新編輯並設為預設。變更執行設定會取消預設，需重新測試。
      </small>
      <div className="row model-editor-wide">
        <Button disabled={busy}>儲存</Button>
        {editing && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              onCancel();
            }}
          >
            取消編輯
          </Button>
        )}
      </div>
    </form>
  );
}
