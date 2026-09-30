import { z } from "zod";
import type { OverviewData } from "@sensel/analytics/contracts";
const timezone = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone");
export const rangeInput = z
  .object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  })
  .refine((range) => {
    const duration = Date.parse(range.to) - Date.parse(range.from);
    return duration > 0 && duration <= 90 * 86400000;
  }, "Range must be positive and at most 90 days")
  .transform((range) => ({
    from: new Date(range.from).toISOString(),
    to: new Date(range.to).toISOString(),
  }));
export const sourceId = z.string().min(1).max(100).optional();
export const settingsInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    timezone,
    reportTitle: z.string().trim().min(1).max(200),
    defaultRangeDays: z.number().int().min(1).max(90),
    expectedVersion: z.number().int().positive(),
  })
  .strict();
export const reportCreateInput = z
  .object({
    chapters: z.array(z.object({id:z.string().min(1).max(80),kind:z.enum(["text","metrics","trend","categories","events"]),title:z.string().trim().min(1).max(120),body:z.string().max(10000),enabled:z.boolean()}).strict()).min(1).max(20).refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length && rows.some(r=>r.enabled)).optional(),
    title: z.string().trim().min(1).max(200),
    range: rangeInput,
    sourceId,
    timeZone: timezone.optional(),
  })
  .strict();
export const reportListInput = z.object({
  query: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const count = z.number().finite().nonnegative();
export const overviewDataSchema: z.ZodType<OverviewData> = z.object({
  version: z.literal(1),
  query: z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    sourceId: z.string().max(100).optional(),
  }),
  generatedAt: z.string().datetime({ offset: true }),
  dataset: z.object({
    kind: z.enum(["synthetic", "customer"]),
    label: z.string().min(1).max(200),
  }),
  metrics: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        label: z.string().max(200),
        value: z.number().finite().nullable(),
        unit: z.string().max(30).optional(),
        description: z.string().max(2000).optional(),
      }),
    )
    .max(30),
  trend: z
    .array(
      z.object({
        time: z.string().datetime({ offset: true }),
        value: count.nullable(),
      }),
    )
    .max(10000),
  categories: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        label: z.string().max(200),
        value: count,
      }),
    )
    .max(1000),
  events: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        time: z.string().datetime({ offset: true }),
        title: z.string().max(1000),
        category: z.string().max(100),
        level: z.string().max(100).optional(),
      }),
    )
    .max(1000),
  coverage: z.object({
    status: z.enum(["complete", "partial", "sampled"]),
    totalEvents: count.int().nullable(),
    explanation: z.string().max(4000).optional(),
  }),
});
