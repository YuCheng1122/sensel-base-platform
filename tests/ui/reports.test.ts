import assert from "node:assert/strict";
import test from "node:test";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import type { ReportSnapshot } from "../../packages/reports/src/contracts";
import {
  csvCell,
  reportCsv,
  reportFilename,
  reportJson,
} from "../../packages/reports/src/report-exports";
import {
  registerReportFont,
  SnapshotPDF,
} from "../../packages/reports/src/snapshot-pdf";

function fixture(): ReportSnapshot {
  const range = {
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-01-02T00:00:00.000Z",
  };
  const coverage = {
    status: "partial" as const,
    totalEvents: null,
    explanation: "合成資料，總量尚未確認",
  };
  return {
    version: 1,
    id: "synthetic-report-id",
    title: "合成測試報告",
    createdAt: range.to,
    ownerId: "synthetic-user",
    range,
    timeZone: "Asia/Taipei",
    source: { id: "synthetic", label: "合成測試來源" },
    coverage,
    data: {
      version: 1,
      query: range,
      generatedAt: range.to,
      dataset: { kind: "synthetic", label: "合成資料" },
      coverage,
      metrics: [
        { id: "missing", label: "未知指標", value: null },
        { id: "zero", label: "已知空資料", value: 0 },
      ],
      trend: [{ time: range.from, value: null }],
      categories: [{ id: "test", label: "測試類別", value: 2 }],
      events: [
        {
          id: "row-1",
          time: range.from,
          title: '=HYPERLINK("https://example.invalid")',
          category: "合成",
        },
      ],
    },
    sections: [
      {
        id: "notes",
        title: "測試說明",
        paragraphs: ["此份報告僅使用合成資料。"],
      },
    ],
  };
}

test("CSV neutralizes spreadsheet formulas, control prefixes and quoted multiline text", () => {
  for (const value of [
    "=1+1",
    "+1",
    "-1",
    "@SUM(A1)",
    "\tcommand",
    "\rcommand",
    "\ncommand",
    "  \tcommand",
    "  =1",
  ])
    assert.ok(
      csvCell(value).startsWith("\"'"),
      `Unescaped prefix ${JSON.stringify(value)}`,
    );
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell(0), '"0"');
  assert.equal(csvCell(null), '""');
});

test("snapshot exports preserve unknown coverage and never mutate saved content", () => {
  const snapshot = fixture();
  const before = structuredClone(snapshot);
  const exported = JSON.parse(reportJson(snapshot));
  assert.deepEqual(exported, snapshot);
  const csv = reportCsv(snapshot);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"metric","missing","未知指標",""'));
  assert.ok(csv.includes('"metric","zero","已知空資料","0"'));
  assert.ok(csv.includes("\"'=HYPERLINK("));
  assert.ok(csv.includes('"partial"'));
  assert.deepEqual(snapshot, before);
  assert.ok(
    !reportFilename({ ...snapshot, title: "../bad/name\n" }, "pdf").includes(
      "/",
    ),
  );
});

test(
  "Chinese PDF embeds local font and paginates long text with saved rows",
  { timeout: 30000 },
  async () => {
    const snapshot = fixture();
    snapshot.data.events = Array.from({ length: 80 }, (_, index) => ({
      id: `synthetic-${index}`,
      time: snapshot.range.from,
      title: `合成資料第 ${index} 筆：` + "長文字換行測試".repeat(12),
      category: "測試類別",
    }));
    snapshot.sections![0]!.paragraphs.push(
      "這是跨頁段落測試，不應截斷。".repeat(100) + "完整段落結尾標記",
    );
    const before = structuredClone(snapshot);
    registerReportFont(
      path.resolve(
        "templates/project/web/public/fonts/NotoSansCJKtc-Regular.otf",
      ),
    );
    const buffer = await renderToBuffer(SnapshotPDF({ snapshot }));
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
    const content = buffer.toString("latin1");
    assert.ok(
      (content.match(/\/Type \/Page\b/g) ?? []).length > 2,
      "Expected real multi-page PDF",
    );
    assert.match(content, /FontFile3|FontFile2/);
    const extracted = spawnSync("pdftotext", ["-", "-"], { input: buffer });
    if (!extracted.error) {
      assert.equal(extracted.status, 0);
      const text = extracted.stdout.toString("utf8").replace(/\s+/g, "");
      for (const expected of [
        "合成測試報告",
        "合成資料第79筆",
        "完整段落結尾標記",
        "分類摘要",
        "未知指標未提供",
      ])
        assert.ok(text.includes(expected), `PDF lost content: ${expected}`);
      const pages = (content.match(/\/Type \/Page\b/g) ?? []).length;
      for (let page = 1; page <= pages; page++)
        assert.ok(text.includes(`第${page}/${pages}頁`));
    }
    if (process.env.REPORTS_TEST_PDF) {
      assert.match(
        process.env.REPORTS_TEST_PDF,
        /^\/tmp\/sensel-[a-zA-Z0-9/_-]+\.pdf$/,
      );
      await writeFile(process.env.REPORTS_TEST_PDF, buffer);
    }
    assert.deepEqual(snapshot, before);
  },
);
