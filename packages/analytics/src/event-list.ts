import type { OverviewCategory, OverviewEvent } from "./contracts";
export type EventSortKey = "time" | "title" | "category" | "level";
export interface EventListOptions {
  search: string;
  category?: string;
  /** undefined means any level; an empty string means no supplied level. */
  level?: string;
  sort: EventSortKey;
  direction: "ascending" | "descending";
}
const collator = new Intl.Collator("zh-TW", {
  numeric: true,
  sensitivity: "base",
});
/** Filters and orders only supplied events; never mutates data or infers severity. */
export function selectEvents(
  events: OverviewEvent[],
  categories: OverviewCategory[],
  options: EventListOptions,
) {
  const labels = new Map(
    categories.map((category) => [category.id, category.label]),
  );
  const search = options.search.trim().toLocaleLowerCase("zh-TW");
  const categoryLabel = (event: OverviewEvent) =>
    labels.get(event.category) ?? event.category;
  return events
    .filter(
      (event) =>
        (!options.category || event.category === options.category) &&
        (options.level === undefined ||
          (event.level ?? "") === options.level) &&
        (!search ||
          `${event.title} ${event.id} ${event.category} ${categoryLabel(event)} ${event.level ?? ""}`
            .toLocaleLowerCase("zh-TW")
            .includes(search)),
    )
    .sort((left, right) => {
      let order: number;
      if (options.sort === "time")
        order = Date.parse(left.time) - Date.parse(right.time);
      else if (options.sort === "category")
        order = collator.compare(categoryLabel(left), categoryLabel(right));
      else
        order = collator.compare(
          left[options.sort] ?? "",
          right[options.sort] ?? "",
        );
      if (order !== 0)
        return options.direction === "ascending" ? order : -order;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
}
