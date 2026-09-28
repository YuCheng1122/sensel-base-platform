"use client";
import { useState } from "react";
import { Button } from "@sensel/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { OverviewCategory } from "./contracts";
const PAGE_SIZE = 5;
/** Source-style horizontal count bars. Percentages use the explicitly returned category subtotal. */
export function CategoryDistribution({
  categories,
  onSelect,
}: {
  categories: OverviewCategory[];
  onSelect?: (category: OverviewCategory) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const peak = Math.max(...categories.map((item) => item.value), 1);
  const subtotal = categories.reduce((sum, item) => sum + item.value, 0);
  if (!categories.length)
    return <p className="overview-empty">目前沒有分類分佈資料。</p>;
  return (
    <div className="overview-distribution">
      <ul>
        {categories
          .slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
          .map((item, index) => {
            const content = (
              <>
                <span className="overview-bar-label">
                  <span>{item.label}</span>
                  <span>
                    {item.value.toLocaleString("zh-TW")} ·{" "}
                    {subtotal
                      ? ((item.value / subtotal) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </span>
                </span>
                <span className="overview-bar-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${(item.value / peak) * 100}%`,
                      background: `var(--chart-${((current * PAGE_SIZE + index) % 5) + 1})`,
                    }}
                  />
                </span>
              </>
            );
            return (
              <li key={item.id}>
                {onSelect ? (
                  <button
                    type="button"
                    className="overview-bar-button"
                    onClick={() => onSelect(item)}
                    aria-label={`在回傳清單查看 ${item.label}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="overview-bar-button">{content}</div>
                )}
              </li>
            );
          })}
      </ul>
      <footer>
        <p className="overview-caption">
          比例分母為回傳分類小計 {subtotal.toLocaleString("zh-TW")}
          ，不是完整事件數。
        </p>
        {pages > 1 && (
          <div className="row">
            <Button
              variant="secondary"
              aria-label="上一頁分類"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <span>
              {current + 1} / {pages}
            </span>
            <Button
              variant="secondary"
              aria-label="下一頁分類"
              disabled={current + 1 >= pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </footer>
    </div>
  );
}
