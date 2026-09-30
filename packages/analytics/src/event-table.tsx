"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@sensel/ui";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type { OverviewCategory, OverviewEvent } from "./contracts";
import { formatOverviewTime } from "./overview-range";
import { selectEvents, type EventSortKey } from "./event-list";
const PAGE_SIZE = 15;
export function EventTable({
  eventHref,
  events,
  totalEvents,
  timeZone = "UTC",
  category,
  categories = [],
  onClearCategory,
  onCategoryChange,
}: {
  eventHref?: (id:string)=>string;
  events: OverviewEvent[];
  totalEvents: number | null;
  timeZone?: string;
  category?: string;
  categories?: OverviewCategory[];
  onClearCategory?: () => void;
  onCategoryChange?: (category: string | undefined) => void;
}) {
  const [search, setSearch] = useState("");
  const [localCategory, setLocalCategory] = useState<string>();
  const selectedCategory = onCategoryChange
    ? category
    : (category ?? localCategory);
  const [levelChoice, setLevelChoice] = useState("all");
  const [sort, setSort] = useState<EventSortKey>("time");
  const [direction, setDirection] = useState<"ascending" | "descending">(
    "descending",
  );
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [selectedCategory, events]);
  const categoryOptions = useMemo(() => {
    const choices = new Map(categories.map((item) => [item.id, item.label]));
    for (const event of events)
      if (!choices.has(event.category))
        choices.set(event.category, event.category);
    return [...choices];
  }, [categories, events]);
  const levels = useMemo(
    () =>
      [...new Set(events.map((event) => event.level ?? ""))].sort((a, b) =>
        a.localeCompare(b, "zh-TW"),
      ),
    [events],
  );
  const filtered = useMemo(
    () =>
      selectEvents(events, categories, {
        search,
        category: selectedCategory,
        level: levelChoice === "all" ? undefined : levelChoice.slice(6),
        sort,
        direction,
      }),
    [
      events,
      categories,
      search,
      selectedCategory,
      levelChoice,
      sort,
      direction,
    ],
  );
  function changeCategory(value: string | undefined) {
    if (onCategoryChange) onCategoryChange(value);
    else {
      setLocalCategory(value);
      if (!value) onClearCategory?.();
    }
    setPage(0);
  }
  function sortBy(value: EventSortKey) {
    setDirection(
      sort === value && direction === "ascending" ? "descending" : "ascending",
    );
    setSort(value);
    setPage(0);
  }
  const columns: { key: EventSortKey; label: string }[] = [
    { key: "time", label: `事件時間（${timeZone}）` },
    { key: "title", label: "事件" },
    { key: "category", label: "分類" },
    { key: "level", label: "等級" },
  ];
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
            ；篩選與排序僅作用於回傳清單。
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
      <div className="overview-event-filters">
        <label className="field">
          <span>清單分類</span>
          <select
            aria-label="清單分類"
            value={selectedCategory ?? ""}
            disabled={category !== undefined && !onCategoryChange}
            onChange={(event) =>
              changeCategory(event.target.value || undefined)
            }
          >
            <option value="">全部分類</option>
            {categoryOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>清單等級</span>
          <select
            aria-label="清單等級"
            value={levelChoice}
            onChange={(event) => {
              setLevelChoice(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">全部等級</option>
            {levels.map((level) => (
              <option key={level} value={`level:${level}`}>
                {level || "未提供"}
              </option>
            ))}
          </select>
        </label>
        {selectedCategory && (
          <Button variant="secondary" onClick={() => changeCategory(undefined)}>
            清除清單分類
          </Button>
        )}
      </div>
      <div className="overview-table-scroll">
        <table className="overview-event-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sort === column.key ? direction : "none"}
                >
                  <button
                    type="button"
                    className="overview-sort"
                    onClick={() => sortBy(column.key)}
                    aria-label={`依${column.label}排序`}
                  >
                    {column.label}
                    {sort !== column.key ? (
                      <ArrowUpDown size={13} aria-hidden="true" />
                    ) : direction === "ascending" ? (
                      <ArrowUp size={13} aria-hidden="true" />
                    ) : (
                      <ArrowDown size={13} aria-hidden="true" />
                    )}
                  </button>
                </th>
              ))}
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
                    <span>{eventHref ? <a href={eventHref(event.id)}>{event.title}</a> : event.title}</span>
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
