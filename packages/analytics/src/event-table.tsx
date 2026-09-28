"use client";
import { useMemo, useState } from "react";
import { Button } from "@sensel/ui";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { OverviewCategory, OverviewEvent } from "./contracts";
import { formatOverviewTime } from "./overview-range";
const PAGE_SIZE = 15;
export function EventTable({
  events,
  totalEvents,
  timeZone = "UTC",
  category,
  categories = [],
  onClearCategory,
}: {
  events: OverviewEvent[];
  totalEvents: number | null;
  timeZone?: string;
  category?: string;
  categories?: OverviewCategory[];
  onClearCategory?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () =>
      events.filter(
        (event) =>
          (!category || event.category === category) &&
          (!search ||
            `${event.title} ${event.category} ${event.id}`
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase())),
      ),
    [events, category, search],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  return (
    <section className="overview-card" aria-label="事件列表">
      <header className="overview-section-heading">
        <div>
          <h2>最近事件</h2>
          <p className="overview-caption">
            回傳 {events.length.toLocaleString("zh-TW")} 筆／符合條件總數{" "}
            {totalEvents === null
              ? "未知"
              : totalEvents.toLocaleString("zh-TW")}
            ；搜尋、分類及分頁僅作用於回傳清單。
          </p>
        </div>
        <label className="overview-event-search">
          <Search size={16} />
          <input
            aria-label="搜尋回傳事件"
            placeholder="搜尋回傳事件"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </header>
      {category && (
        <div className="overview-local-filter">
          <span>
            清單分類：
            {categories.find((item) => item.id === category)?.label ?? category}
          </span>
          <Button variant="secondary" onClick={onClearCategory}>
            清除清單分類
          </Button>
        </div>
      )}
      <div className="overview-table-scroll">
        <table className="overview-event-table">
          <thead>
            <tr>
              <th scope="col">事件時間（{timeZone}）</th>
              <th scope="col">事件</th>
              <th scope="col">分類</th>
              <th scope="col">等級</th>
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
              .map((event) => (
                <tr key={event.id}>
                  <td>
                    <time dateTime={event.time}>
                      {formatOverviewTime(event.time, timeZone)}
                    </time>
                  </td>
                  <td>
                    <span>{event.title}</span>
                    <small>{event.id}</small>
                  </td>
                  <td>
                    {categories.find((item) => item.id === event.category)
                      ?.label ?? event.category}
                  </td>
                  <td>
                    {event.level ? (
                      <span className="overview-level">{event.level}</span>
                    ) : (
                      "未提供"
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p className="overview-empty">
          {events.length
            ? "回傳清單中沒有符合篩選條件的事件。"
            : "這個時間範圍沒有回傳事件。"}
        </p>
      )}
      <footer className="overview-table-footer">
        <span>回傳清單內符合 {filtered.length.toLocaleString("zh-TW")} 筆</span>
        <div className="row">
          <Button
            variant="secondary"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label="上一頁事件"
          >
            <ChevronLeft size={14} />
          </Button>
          <span>
            {current + 1} / {pages}
          </span>
          <Button
            variant="secondary"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
            aria-label="下一頁事件"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </footer>
    </section>
  );
}
