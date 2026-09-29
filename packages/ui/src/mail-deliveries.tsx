"use client";
import { useCallback, useEffect, useState } from "react";
import type { MailDelivery } from "@sensel/mail/contracts";
import { request } from "./api-client";
import { Button, Notice } from "./primitives";
import { MailReceipt } from "./mail-receipt";

export function MailDeliveries({
  revision,
  onObserved,
}: {
  revision: number;
  onObserved: (items: MailDelivery[]) => void;
}) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MailDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setBusy(true);
      setError("");
      try {
        const result = await request<{ items: MailDelivery[]; total: number }>(
          `/mail/deliveries?page=${page}&pageSize=10`,
          { signal },
        );
        if (signal?.aborted) return;
        setItems(result.items);
        setTotal(result.total);
        onObserved(result.items);
      } catch (cause) {
        if (!signal?.aborted)
          setError(
            cause instanceof Error ? cause.message : "無法載入投遞紀錄。",
          );
      } finally {
        if (!signal?.aborted) setBusy(false);
      }
    },
    [page, onObserved],
  );
  useEffect(() => {
    const abort = new AbortController();
    void load(abort.signal);
    return () => abort.abort();
  }, [load, revision]);
  return (
    <section className="panel mail-card" aria-label="投遞紀錄">
      <header className="mail-card-header">
        <div>
          <h2>最近投遞紀錄</h2>
          <p>紀錄已接受不等於已送達；重新整理不會重新寄信。</p>
        </div>
        <Button variant="secondary" disabled={busy} onClick={() => void load()}>
          重新整理投遞紀錄
        </Button>
      </header>
      {error && <Notice error>{error}</Notice>}
      {busy && <p role="status">載入投遞紀錄…</p>}
      {!busy && !error && items.length === 0 && <p>尚無投遞紀錄。</p>}
      <div className="mail-delivery-list">
        {items.map((item) => (
          <article key={item.id} className="mail-delivery">
            <div>
              <strong>{item.to.join(", ")}</strong>
              <p>{item.subject}</p>
              <p className="mail-meta">
                {new Date(item.createdAt).toLocaleString("zh-TW", {
                  timeZone: "UTC",
                })}{" "}
                UTC · 設定 v{item.configVersion}
              </p>
              <p className="mail-meta">
                紀錄 ID：<code>{item.id}</code>
              </p>
            </div>
            <MailReceipt delivery={item} />
          </article>
        ))}
      </div>
      <div className="row mail-pagination">
        <Button
          variant="secondary"
          disabled={busy || page <= 1}
          onClick={() => setPage(page - 1)}
        >
          上一頁
        </Button>
        <span>
          第 {page} 頁 · 共 {total} 筆
        </span>
        <Button
          variant="secondary"
          disabled={busy || page * 10 >= total}
          onClick={() => setPage(page + 1)}
        >
          下一頁
        </Button>
      </div>
    </section>
  );
}
