import assert from "node:assert/strict";
import test from "node:test";
import type { OverviewData } from "../src/contracts";
import {
  assertOverviewData,
  coverageDescription,
  formatOverviewTime,
  presetRange,
  validateRange,
} from "../src/overview-range";
const from = "2026-01-01T00:00:00.000Z",
  to = "2026-01-02T00:00:00.000Z";
function fixture(): OverviewData {
  return {
    version: 1,
    query: { from, to, sourceId: "all" },
    generatedAt: to,
    dataset: { kind: "synthetic", label: "Synthetic acceptance" },
    metrics: [{ id: "count", label: "Count", value: 2 }],
    trend: [{ time: from, value: 2 }],
    categories: [{ id: "a", label: "Category A", value: 2 }],
    events: [{ id: "1", time: from, title: "Synthetic record", category: "a" }],
    coverage: { status: "complete", totalEvents: 2 },
  };
}
test("presets anchor both endpoints once and reject invalid/unbounded ranges", () => {
  assert.deepEqual(presetRange(1, Date.parse(to)), { from, to });
  assert.equal(validateRange({ from, to }), null);
  assert.match(validateRange({ from: to, to: from })!, /早於/);
  assert.match(validateRange({ from: "2026-01-01T00:00", to })!, /時區/);
  assert.match(validateRange({ from, to: "2026-05-01T00:00:00.000Z" })!, /90/);
});
test("coverage separates full matching count, returned subset and unknown totals", () => {
  const data = fixture();
  assertOverviewData(data, data.query);
  assert.match(coverageDescription(data), /符合條件 2 筆.*回傳事件 1 筆/);
  data.coverage = {
    status: "sampled",
    totalEvents: null,
    explanation: "Sample only",
  };
  assert.match(coverageDescription(data), /抽樣資料.*總數未知/);
  assertOverviewData(data);
});
test("response scope mismatches and impossible counts fail instead of showing an empty result", () => {
  const data = fixture();
  assert.throws(
    () => assertOverviewData(data, { from, to, sourceId: "other" }),
    /不一致/,
  );
  data.coverage.totalEvents = 0;
  assert.throws(() => assertOverviewData(data), /總數/);
});
test("event ranges are half-open and unknown chart values remain null", () => {
  const data = fixture();
  data.metrics[0]!.value = null;
  data.trend[0]!.value = null;
  assertOverviewData(data);
  assert.equal(data.trend[0]!.value, null);
  data.events[0]!.time = to;
  assert.throws(() => assertOverviewData(data), /範圍/);
});
test("duplicate buckets and nonfinite values cannot masquerade as valid charts", () => {
  const data = fixture();
  data.trend.push({ ...data.trend[0]! });
  assert.throws(() => assertOverviewData(data), /重複/);
  data.trend.pop();
  data.categories[0]!.value = Number.NaN;
  assert.throws(() => assertOverviewData(data), /數值/);
});
test("display timezone is explicit while the stored ISO instant stays unchanged", () => {
  assert.notEqual(
    formatOverviewTime(from, "UTC"),
    formatOverviewTime(from, "Asia/Taipei"),
  );
  assert.equal(fixture().query.from, from);
});

test("source selection never invents an all-sources permission", async () => {
  const { selectOverviewSource } = await import("../src/overview-source");
  const sources = [
    { id: "nginx", label: "Nginx" },
    { id: "pcap", label: "PCAP" },
  ];
  assert.equal(selectOverviewSource(sources), "nginx");
  assert.equal(selectOverviewSource(sources, "all"), "nginx");
  assert.equal(selectOverviewSource(sources, "pcap"), "pcap");
  assert.equal(selectOverviewSource([]), undefined);
});
