"use client";
import { useState } from "react";
import { CheckCircle2, Circle, Search } from "lucide-react";
import type { Model } from "./api-client";
import { Button } from "./primitives";
export function ModelCatalog({
  items,
  selectedId,
  onSelect,
  busy,
  onEdit,
  onTest,
}: {
  items: Model[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  busy: boolean;
  onEdit: (model: Model) => void;
  onTest: (model: Model, mode: "connection" | "tools") => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) =>
    `${item.name} ${item.provider} ${item.model}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0];
  return (
    <section className="model-catalog" aria-label="已儲存模型">
      <h2>已儲存模型</h2>
      <div className="model-catalog-grid">
        <div className="panel model-catalog-list">
          <label className="search-control">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="搜尋模型"
              placeholder="搜尋模型名稱或提供者"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <p className="muted">{filtered.length} 個模型</p>
          <div
            className="model-catalog-scroll"
            role="list"
            aria-label="模型清單"
          >
            {filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`model-choice ${selected?.id === item.id ? "is-selected" : ""}`}
                onClick={() => onSelect(item.id)}
                aria-label={item.name}
                aria-pressed={selected?.id === item.id}
              >
                <strong>{item.name}</strong>
                <span>
                  {item.provider} · {item.model}
                </span>
                <small>
                  {item.enabled ? "已啟用" : "未啟用"}
                  {item.isDefault ? " · 預設" : ""}
                </small>
              </button>
            ))}
            {!filtered.length && (
              <p className="muted">
                {items.length
                  ? "沒有符合搜尋的模型。"
                  : "尚無模型，請新增設定。"}
              </p>
            )}
          </div>
        </div>
        <section className="panel model-detail" aria-label="模型詳情">
          {selected ? (
            <>
              <header>
                <h2>{selected.name}</h2>
                <span className="status-badge">
                  {selected.enabled ? "已啟用" : "未啟用"}
                  {selected.isDefault ? " · 預設" : ""}
                </span>
              </header>
              <div className="model-detail-scroll">
                <p>
                  {selected.provider} · <code>{selected.model}</code>
                </p>
                {selected.baseUrl && <p className="mono">{selected.baseUrl}</p>}
                <p>金鑰：{selected.hasApiKey ? "已設定" : "未設定"}</p>
                <div className="model-checks">
                  <h3>
                    {selected.testedVersion === selected.version ? (
                      <CheckCircle2 size={16} aria-hidden="true" />
                    ) : (
                      <Circle size={16} aria-hidden="true" />
                    )}
                    模型測試結果
                  </h3>
                  <dl>
                    <div>
                      <dt>API 連線</dt>
                      <dd>
                        連線：
                        {selected.testedVersion === selected.version
                          ? "已驗證"
                          : "尚未驗證目前版本"}
                      </dd>
                    </div>
                    <div>
                      <dt>工具呼叫</dt>
                      <dd>
                        工具能力：
                        {selected.toolsTestedVersion !== selected.version ||
                        selected.toolsSupported === null
                          ? "尚未驗證目前版本"
                          : selected.toolsSupported
                            ? "已驗證"
                            : "不支援"}
                      </dd>
                    </div>
                  </dl>
                </div>
                <p className="muted">
                  逾時 {selected.timeoutSeconds} 秒 · 輸出上限{" "}
                  {selected.maxOutputTokens} tokens
                </p>
                <div className="row">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`編輯 ${selected.name}`}
                    onClick={() => onEdit(selected)}
                  >
                    編輯
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`測試 ${selected.name}`}
                    onClick={() => onTest(selected, "connection")}
                  >
                    測試連線
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`工具測試 ${selected.name}`}
                    onClick={() => onTest(selected, "tools")}
                  >
                    測試工具
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="muted">選擇模型以查看設定與測試結果。</p>
          )}
        </section>
      </div>
    </section>
  );
}
