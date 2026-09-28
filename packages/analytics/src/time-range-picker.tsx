"use client";
import { useState, type FormEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { CalendarClock, Check } from "lucide-react";
import { Button, Field, Notice } from "@sensel/ui";
import type { OverviewRange } from "./contracts";
import {
  formatOverviewTime,
  presetRange,
  validateRange,
} from "./overview-range";
const utcInput = (iso: string) =>
  Number.isFinite(Date.parse(iso))
    ? new Date(iso).toISOString().slice(0, 16)
    : "";
const PRESETS = [
  { label: "近 15 分鐘", days: 15 / 1440 },
  { label: "近 1 小時", days: 1 / 24 },
  { label: "近 6 小時", days: 6 / 24 },
  { label: "近 24 小時", days: 1 },
  { label: "近 7 天", days: 7 },
  { label: "近 30 天", days: 30 },
];
export function TimeRangePicker({
  value,
  onChange,
  timeZone = "UTC",
  disabled = false,
}: {
  value: OverviewRange;
  onChange: (range: OverviewRange) => void;
  timeZone?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  function custom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from") ?? ""),
      to = String(form.get("to") ?? "");
    const range = { from: `${from}:00Z`, to: `${to}:00Z` };
    const problem = validateRange(range);
    if (problem) {
      setError(problem);
      return;
    }
    onChange({
      from: new Date(range.from).toISOString(),
      to: new Date(range.to).toISOString(),
    });
    setOpen(false);
    setError("");
  }
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError("");
      }}
    >
      <Popover.Trigger asChild>
        <Button
          variant="secondary"
          disabled={disabled}
          className="overview-range-trigger"
        >
          <CalendarClock size={16} />
          <span>
            {formatOverviewTime(value.from, timeZone, true)} —{" "}
            {formatOverviewTime(value.to, timeZone, true)}
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="overview-range-popover"
          align="end"
          sideOffset={8}
          aria-label="時間範圍"
        >
          <div className="overview-range-presets">
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => {
                  onChange(presetRange(preset.days));
                  setOpen(false);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <form key={`${value.from}-${value.to}`} onSubmit={custom}>
            <h2>自訂時間（UTC）</h2>
            <Field label="起始時間（UTC）">
              <input
                name="from"
                type="datetime-local"
                defaultValue={utcInput(value.from)}
                required
              />
            </Field>
            <Field label="結束時間（UTC）">
              <input
                name="to"
                type="datetime-local"
                defaultValue={utcInput(value.to)}
                required
              />
            </Field>
            <p className="overview-caption">
              起點包含、終點不包含；最多 90 天。圖表時區：{timeZone}。
            </p>
            {error && <Notice error>{error}</Notice>}
            <Button>
              <Check size={14} />
              套用時間
            </Button>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
