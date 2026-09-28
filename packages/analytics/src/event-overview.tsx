"use client";
import { useEffect, useRef, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@sensel/ui";
import type {
  OverviewAdapter,
  OverviewData,
  OverviewQuery,
  OverviewSource,
} from "./contracts";
import {
  assertOverviewData,
  presetRange,
  validateRange,
} from "./overview-range";
import { selectOverviewSource } from "./overview-source";
import { TimeRangePicker } from "./time-range-picker";
import { OverviewDashboard } from "./overview-dashboard";
export function EventOverview({
  adapter,
  defaultRangeDays = 7,
  timeZone = "UTC",
  initialQuery,
  title = "事件概覽",
}: {
  adapter: OverviewAdapter;
  defaultRangeDays?: number;
  timeZone?: string;
  initialQuery?: OverviewQuery;
  title?: string;
}) {
  const [query, setQuery] = useState<OverviewQuery>(
    () => initialQuery ?? presetRange(defaultRangeDays),
  );
  const [sources, setSources] = useState<OverviewSource[]>([]);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState("");
  const [sourcesError, setSourcesError] = useState("");
  const [sourcesReady, setSourcesReady] = useState(false);
  const loadedAdapter = useRef<OverviewAdapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const latest = useRef(0);
  useEffect(() => {
    const abort = new AbortController();
    loadedAdapter.current = null;
    setSourcesReady(false);
    setSources([]);
    setData(null);
    setSourcesError("");
    setError("");
    adapter
      .sources(abort.signal)
      .then((items) => {
        if (!abort.signal.aborted) {
          setSources(items);
          setQuery((current) => {
            const sourceId = selectOverviewSource(items, current.sourceId);
            return current.sourceId === sourceId
              ? current
              : { ...current, sourceId };
          });
          loadedAdapter.current = adapter;
          setSourcesReady(true);
          if (!items.length) setLoading(false);
        }
      })
      .catch((cause) => {
        if (!abort.signal.aborted) {
          setSourcesError(
            cause instanceof Error ? cause.message : "無法載入來源。",
          );
          setLoading(false);
        }
      });
    return () => abort.abort();
  }, [adapter, revision]);
  useEffect(() => {
    const abort = new AbortController();
    const request = ++latest.current;
    setLoading(true);
    setError("");
    setData(null);
    if (
      !sourcesReady ||
      loadedAdapter.current !== adapter ||
      !query.sourceId ||
      !sources.some((source) => source.id === query.sourceId)
    ) {
      setLoading(!sourcesReady && !sourcesError);
      return () => abort.abort();
    }
    const problem = validateRange(query);
    if (problem) {
      setError(problem);
      setLoading(false);
      return () => abort.abort();
    }
    adapter
      .load(query, abort.signal)
      .then((result) => {
        if (abort.signal.aborted || request !== latest.current) return;
        assertOverviewData(result, query);
        setData(result);
      })
      .catch((cause) => {
        if (!abort.signal.aborted && request === latest.current)
          setError(
            cause instanceof Error ? cause.message : "無法載入事件概覽。",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted && request === latest.current)
          setLoading(false);
      });
    return () => abort.abort();
  }, [adapter, query, sourcesReady, sources, sourcesError]);
  return (
    <div className="event-overview">
      <header className="overview-page-header">
        <div>
          <h1>
            <Activity size={24} />
            {title}
          </h1>
          <p>比較事件量與分類分佈，從同一時間範圍查看資料。</p>
        </div>
        <div className="overview-page-controls">
          <TimeRangePicker
            value={query}
            onChange={(range) =>
              setQuery({ ...range, sourceId: query.sourceId })
            }
            timeZone={timeZone}
          />
          <Button
            variant="secondary"
            aria-label="重新整理事件概覽"
            disabled={loading}
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </header>
      <div
        className="overview-source-filter"
        role="group"
        aria-label="事件來源"
      >
        <span>來源</span>
        {sources.map((source) => (
          <button
            key={source.id}
            type="button"
            aria-pressed={query.sourceId === source.id}
            disabled={!sourcesReady}
            onClick={() => setQuery({ ...query, sourceId: source.id })}
          >
            {source.label}
          </button>
        ))}
      </div>
      {sourcesError || error ? (
        <section className="overview-card overview-load-error" role="alert">
          <h2>無法載入事件概覽</h2>
          <p>{sourcesError || error}</p>
          <Button
            variant="secondary"
            onClick={() => setRevision((value) => value + 1)}
          >
            重新載入
          </Button>
        </section>
      ) : sourcesReady && sources.length === 0 ? (
        <section className="overview-card">
          <h2>沒有可用的資料來源</h2>
          <p className="overview-caption">
            目前帳號沒有可查詢的來源，請確認專案資料接入與授權設定。
          </p>
        </section>
      ) : !sourcesReady || loading ? (
        <div
          className="overview-loading"
          role="status"
          aria-label="載入事件概覽"
        >
          <span>載入中…</span>
          <div />
          <div />
        </div>
      ) : data ? (
        <OverviewDashboard
          key={`${query.from}-${query.to}-${query.sourceId ?? ""}`}
          data={data}
          timeZone={timeZone}
        />
      ) : null}
    </div>
  );
}
