"use client";
import { useState, type FormEvent } from "react";
import { ReportChapterEditor } from "./report-chapter-editor";
import { defaultChapters } from "./report-document";
import { Button, Field, Notice } from "@sensel/ui";
import type { OverviewSource } from "@sensel/analytics/contracts";
import type { CreateReportInput, ReportsDefaults } from "./contracts";
const utcInput = (value: number) => new Date(value).toISOString().slice(0, 16);
export function ReportCaptureForm({
  sources,
  defaults,
  busy,
  onCreate, onPreview, initial,
}: {
  initial?: CreateReportInput;
  onPreview?: (input: CreateReportInput) => Promise<void>;
  sources: OverviewSource[];
  defaults: ReportsDefaults;
  busy: boolean;
  onCreate: (input: CreateReportInput) => Promise<void>;
}) {
  const [chapters, setChapters] = useState(initial?.chapters ?? defaults.chapters ?? defaultChapters());
  const [title, setTitle] = useState(initial?.title ?? defaults.title);
  const [from, setFrom] = useState(() =>
    initial?.range.from.slice(0,16) ?? utcInput(Date.now() - defaults.rangeDays * 86400000),
  );
  const [to, setTo] = useState(() => initial?.range.to.slice(0,16) ?? utcInput(Date.now()));
  const [sourceId, setSourceId] = useState(initial?.sourceId ?? sources[0]?.id ?? "");
  const [timeZone, setTimeZone] = useState(initial?.timeZone ?? defaults.timeZone);
  const chosenSource = sources.some((source) => source.id === sourceId)
    ? sourceId
    : (sources[0]?.id ?? "");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const start = new Date(`${from}:00Z`),
      end = new Date(`${to}:00Z`);
    if (
      !title.trim() ||
      !Number.isFinite(+start) ||
      !Number.isFinite(+end) ||
      +start >= +end
    ) {
      setError("請填寫標題，並確認開始時間早於結束時間。");
      return;
    }
    try {
      new Intl.DateTimeFormat("zh-TW", { timeZone }).format(start);
    } catch {
      setError("請填寫有效的 IANA 時區，例如 Asia/Taipei 或 UTC。");
      return;
    }
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "preview" ? onPreview : onCreate;
    await action?.({
      chapters,
      title: title.trim(),
      range: { from: start.toISOString(), to: end.toISOString() },
      sourceId: chosenSource || undefined,
      timeZone,
    });
  }
  return (
    <section className="panel report-capture" aria-label="建立報告">
      <h2>建立報告</h2>
      <form onSubmit={submit}>
        <fieldset
          disabled={busy || !sources.length}
          className="report-capture-fields"
        >
          <Field label="報告標題">
            <input
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label="資料來源">
            <select
              value={chosenSource}
              onChange={(event) => setSourceId(event.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="開始時間（UTC，包含）">
            <input
              required
              type="datetime-local"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="結束時間（UTC，不包含）">
            <input
              required
              type="datetime-local"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Field label="報告顯示時區">
            <input
              required
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
            />
          </Field>
        </fieldset>
        <p className="muted">報告保存建立當下的資料；更新內容請建立新報告。</p>
        {!sources.length && (
          <Notice error>目前沒有可用資料來源，無法建立報告。</Notice>
        )}
        {error && <Notice error>{error}</Notice>}
        <ReportChapterEditor defaults={defaults.chapters} value={chapters} onChange={setChapters} disabled={busy}/>
        <div className="report-actions">
          {onPreview && <Button value="preview" variant="secondary" disabled={busy || !sources.length}>預覽圖文報告</Button>}
          <Button disabled={busy || !sources.length}>
            {busy ? "保存中…" : "生成並保存新快照"}
          </Button>
        </div>
      </form>
    </section>
  );
}
