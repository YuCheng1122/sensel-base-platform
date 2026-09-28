"use client";
import { useCallback, useEffect, useState } from "react";
import { Button, Field, Notice, PageHeader } from "@sensel/ui";
import type { OverviewSource } from "@sensel/analytics/contracts";
import type {
  CreateReportInput,
  ReportList,
  ReportSnapshot,
  ReportSummary,
  ReportsAdapter,
  ReportsDefaults,
} from "./contracts";
import { ReportCaptureForm } from "./report-capture-form";
import { ReportPreview } from "./report-preview";
export function ReportsCenter({
  adapter,
  sources,
  captureEnabled = true,
  defaults = { title: "期間分析報告", rangeDays: 7, timeZone: "UTC" },
  fontSrc = "/fonts/NotoSansCJKtc-Regular.otf",
}: {
  adapter: ReportsAdapter;
  sources: OverviewSource[];
  captureEnabled?: boolean;
  defaults?: ReportsDefaults;
  fontSrc?: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ReportList | null>(null);
  const [selected, setSelected] = useState("");
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const refresh = useCallback(() => {
    setPage(1);
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setList(null);
    adapter
      .list(
        { query: query.trim() || undefined, page, pageSize: 10 },
        controller.signal,
      )
      .then((result) => {
        if (!controller.signal.aborted) setList(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "無法載入報告清單，請重新整理。已保存報告不會因清單失敗而重建。",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [adapter, query, page, revision]);
  useEffect(() => {
    setSnapshot(null);
    setDetailLoading(false);
    if (!selected) return;
    const controller = new AbortController();
    setDetailLoading(true);
    adapter
      .get(selected, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setSnapshot(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("報告不存在或目前無法存取，請重新整理清單。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [adapter, selected, revision]);
  async function create(input: CreateReportInput) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await adapter.create(input);
      setQuery("");
      refresh();
      setSelected(saved.id);
      setNotice("報告已保存。預覽與下載只使用這份固定快照。");
    } catch {
      setError("建立結果未確認。請先重新整理清單核對，避免重複建立。");
    } finally {
      setBusy(false);
    }
  }
  async function remove(report: ReportSummary) {
    if (!window.confirm(`確定刪除報告「${report.title}」？此操作無法復原。`))
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await adapter.delete(report.id);
      if (selected === report.id) {
        setSelected("");
        setSnapshot(null);
      }
      refresh();
      setNotice("報告已刪除。");
    } catch {
      setError("刪除結果未確認，請重新整理清單核對。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="reports-center">
      <PageHeader title="報告下載">
        <Button
          variant="secondary"
          disabled={loading || busy}
          onClick={() => {
            setError("");
            refresh();
          }}
        >
          重新整理報告清單
        </Button>
      </PageHeader>
      {captureEnabled ? (
        <ReportCaptureForm
          sources={sources}
          defaults={defaults}
          busy={busy}
          onCreate={create}
        />
      ) : (
        <Notice>目前無法建立新快照，仍可查看已保存報告。</Notice>
      )}
      {notice && <Notice>{notice}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <section className="panel report-library" aria-label="已保存報告">
        <h2>已保存報告</h2>
        <p className="muted">
          僅列目前帳號可存取的報告，依建立時間新到舊排序。
        </p>
        <Field label="搜尋報告">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="搜尋標題"
          />
        </Field>
        {loading ? (
          <p role="status">載入報告清單…</p>
        ) : list?.items.length ? (
          <div className="report-list">
            {list.items.map((report) => (
              <div className="report-list-row" key={report.id}>
                <button
                  type="button"
                  className={`report-choice ${selected === report.id ? "is-selected" : ""}`}
                  aria-label={`開啟報告：${report.title}`}
                  aria-pressed={selected === report.id}
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setSelected(report.id);
                  }}
                >
                  <strong>{report.title}</strong>
                  <span>
                    {new Date(report.createdAt).toLocaleString("zh-TW", {
                      timeZone: report.timeZone,
                    })}
                    （{report.timeZone}） · {report.source.label} ·{" "}
                    {report.coverage.totalEvents ?? "未知"} 筆
                  </span>
                </button>
                <Button
                  variant="secondary"
                  aria-label={`刪除報告：${report.title}`}
                  disabled={busy}
                  onClick={() => void remove(report)}
                >
                  刪除
                </Button>
              </div>
            ))}
          </div>
        ) : (
          list && <p>目前沒有符合條件的報告。</p>
        )}
        <nav aria-label="報告清單分頁" className="report-pagination">
          <Button
            variant="secondary"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            上一頁
          </Button>
          <span>
            第 {page} 頁{list ? ` · 共 ${list.total} 份` : ""}
          </span>
          <Button
            variant="secondary"
            disabled={loading || !list || page * list.pageSize >= list.total}
            onClick={() => setPage((value) => value + 1)}
          >
            下一頁
          </Button>
        </nav>
      </section>
      {detailLoading && <p role="status">載入固定快照…</p>}
      {snapshot && (
        <ReportPreview
          key={snapshot.id}
          snapshot={snapshot}
          adapter={adapter}
          fontSrc={fontSrc}
        />
      )}
    </div>
  );
}
