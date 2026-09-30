import { resolvedChapters } from "./report-document";
import type { ReportSnapshot } from "./contracts";

/** Prevent spreadsheet formula execution, including prefixes hidden by whitespace. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[ \t\r\n]*[=+@-]|^[ ]*[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(snapshot: ReportSnapshot): string {
  const rows: unknown[][] = [
    ["section", "id", "label", "value", "unit", "time", "category", "level"],
    [
      "report",
      snapshot.id,
      snapshot.title,
      snapshot.coverage.status,
      "",
      snapshot.createdAt,
    ],
    ["range", "from", "inclusive", snapshot.range.from],
    ["range", "to", "exclusive", snapshot.range.to],
    [
      "coverage",
      "totalEvents",
      "Exact matching count",
      snapshot.coverage.totalEvents,
    ],
    ["coverage", "explanation", snapshot.coverage.explanation ?? ""],
    ...snapshot.data.metrics.map((m) => [
      "metric",
      m.id,
      m.label,
      m.value,
      m.unit,
    ]),
    ...snapshot.data.trend.map((p) => ["trend", "", "", p.value, "", p.time]),
    ...snapshot.data.categories.map((c) => [
      "category",
      c.id,
      c.label,
      c.value,
    ]),
    ...snapshot.data.events.map((e) => [
      "event",
      e.id,
      e.title,
      "",
      "",
      e.time,
      e.category,
      e.level,
    ]),
    ...resolvedChapters(snapshot).map(s => ["narrative",s.id,s.title,s.body]),
  ];
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        Array.from({ length: 8 }, (_, i) => csvCell(row[i])).join(","),
      )
      .join("\r\n") +
    "\r\n"
  );
}
export function reportJson(snapshot: ReportSnapshot): string {
  return JSON.stringify(snapshot, null, 2) + "\n";
}
export function reportFilename(
  snapshot: ReportSnapshot,
  extension: "pdf" | "csv" | "json",
): string {
  const title =
    Array.from(snapshot.title, (char) => (char.charCodeAt(0) < 32 ? "_" : char))
      .join("")
      .replace(/[<>:"/\\|?*]/g, "_")
      .trim()
      .slice(0, 80) || "report";
  return `${title}-${snapshot.id.slice(0, 12)}.${extension}`;
}
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
