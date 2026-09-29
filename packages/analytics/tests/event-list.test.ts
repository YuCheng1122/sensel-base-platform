import test from "node:test";
import assert from "node:assert/strict";
import { selectEvents, type EventListOptions } from "../src/event-list";
import type { OverviewEvent } from "../src/contracts";
const events: OverviewEvent[] = [
  {
    id: "b",
    time: "2026-01-01T01:00:00Z",
    title: "Event 2",
    category: "x",
    level: "warning",
  },
  {
    id: "a",
    time: "2026-01-01T01:00:00Z",
    title: "Event 1",
    category: "y",
    level: "error",
  },
  { id: "c", time: "2026-01-01T00:00:00Z", title: "Event 10", category: "x" },
];
const categories = [
  { id: "x", label: "Alpha", value: 2 },
  { id: "y", label: "Beta", value: 1 },
];
const defaults: EventListOptions = {
  search: "",
  sort: "time",
  direction: "descending",
};
test("time ordering uses ID ties and leaves the source snapshot untouched", () => {
  const before = JSON.stringify(events);
  assert.deepEqual(
    selectEvents(events, categories, defaults).map((event) => event.id),
    ["a", "b", "c"],
  );
  assert.equal(JSON.stringify(events), before);
});
test("category, literal level and category-label search compose before pagination", () => {
  assert.deepEqual(
    selectEvents(events, categories, {
      ...defaults,
      category: "x",
      level: "",
      search: "alpha",
    }).map((event) => event.id),
    ["c"],
  );
  assert.deepEqual(
    selectEvents(events, categories, {
      ...defaults,
      category: "y",
      level: "warning",
    }),
    [],
  );
});
test("title/category/level sort by displayed labels, without invented severity ranks", () => {
  assert.deepEqual(
    selectEvents(events, categories, {
      ...defaults,
      sort: "title",
      direction: "ascending",
    }).map((event) => event.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    selectEvents(events, categories, {
      ...defaults,
      sort: "category",
      direction: "ascending",
    }).map((event) => event.id),
    ["b", "c", "a"],
  );
  assert.deepEqual(
    selectEvents(events, categories, {
      ...defaults,
      sort: "level",
      direction: "ascending",
    }).map((event) => event.id),
    ["c", "a", "b"],
  );
});
