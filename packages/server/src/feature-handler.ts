import { randomUUID } from "node:crypto";
import { z } from "zod";
import type {
  OverviewQuery,
  OverviewSource,
} from "@sensel/analytics/contracts";
import type { ReportSnapshot } from "@sensel/reports/contracts";
import type { AnalysisActor } from "./feature-types";
import type { CoreConfig, User } from "./types";
import { CoreError, required } from "./errors";
import {
  overviewDataSchema,
  rangeInput,
  reportCreateInput,
  reportListInput,
  settingsInput,
  sourceId,
} from "./feature-validation";
const analysisActor = (user: User): AnalysisActor => ({
  id: user.id,
  role: user.role,
  groupIds: [...user.groupIds],
});
async function sources(
  config: CoreConfig,
  user: User,
): Promise<OverviewSource[]> {
  if (!config.analysisProvider)
    throw new CoreError(
      "FEATURE_UNAVAILABLE",
      503,
      "This project has no analysis provider configured",
    );
  try {
    return z
      .array(
        z.object({
          id: z.string().min(1).max(100),
          label: z.string().min(1).max(200),
        }),
      )
      .max(1000)
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        "Duplicate source IDs",
      )
      .parse(await config.analysisProvider.sources(analysisActor(user)));
  } catch {
    throw new CoreError(
      "PROVIDER_UNAVAILABLE",
      503,
      "Analysis sources could not be loaded",
    );
  }
}
async function collect(config: CoreConfig, user: User, query: OverviewQuery) {
  if (!config.analysisProvider) throw new CoreError("FEATURE_UNAVAILABLE", 503);
  try {
    const data = overviewDataSchema.parse(
      await config.analysisProvider.collect({
        actor: analysisActor(user),
        query,
      }),
    );
    if (
      data.query.from !== query.from ||
      data.query.to !== query.to ||
      (data.query.sourceId ?? "all") !== (query.sourceId ?? "all")
    )
      throw new Error("QUERY_MISMATCH");
    const inside = (value: string) =>
      Date.parse(value) >= Date.parse(query.from) &&
      Date.parse(value) < Date.parse(query.to);
    const unique = (values: string[]) => new Set(values).size === values.length;
    const categories = new Set(data.categories.map((item) => item.id));
    if (
      !data.events.every(
        (event) => inside(event.time) && categories.has(event.category),
      ) ||
      !data.trend.every((point) => inside(point.time))
    )
      throw new Error("INVALID_DATA_RANGE");
    if (
      !unique(data.events.map((item) => item.id)) ||
      !unique(data.trend.map((item) => item.time)) ||
      !unique(data.categories.map((item) => item.id)) ||
      !unique(data.metrics.map((item) => item.id))
    )
      throw new Error("DUPLICATE_DATA_IDS");
    if (
      data.coverage.totalEvents !== null &&
      data.coverage.totalEvents < data.events.length
    )
      throw new Error("INVALID_COVERAGE");
    if (Buffer.byteLength(JSON.stringify(data), "utf8") > 5 * 1024 * 1024)
      throw new Error("SNAPSHOT_TOO_LARGE");
    return data;
  } catch {
    throw new CoreError(
      "PROVIDER_UNAVAILABLE",
      503,
      "Analysis data could not be collected; no snapshot was saved",
    );
  }
}
export async function handleFeatures(
  config: CoreConfig,
  user: User,
  path: string[],
  request: Request,
): Promise<Response | null> {
  const method = request.method,
    url = new URL(request.url);
  if (path[0] === "settings") {
    if (path.length === 1 && method === "GET")
      return Response.json({ item: await config.store.settings() });
    if (user.role !== "ADMIN") throw new CoreError("FORBIDDEN", 403);
    if (path.length === 1 && method === "PATCH")
      return Response.json({
        item: await config.store.saveSettings(
          user.id,
          settingsInput.parse(await request.json()),
        ),
      });
    if (path[1] === "audit" && path.length === 2 && method === "GET") {
      const cursor = z
        .string()
        .uuid()
        .optional()
        .parse(url.searchParams.get("cursor") ?? undefined);
      return Response.json(await config.store.settingsAudit(user.id, cursor));
    }
    throw new CoreError("NOT_FOUND", 404);
  }
  if (path[0] === "overview" && method === "GET") {
    const available = await sources(config, user);
    if (path[1] === "sources" && path.length === 2)
      return Response.json({ items: available });
    if (path.length !== 1) throw new CoreError("NOT_FOUND", 404);
    const range = rangeInput.parse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
    });
    const id =
      sourceId.parse(url.searchParams.get("sourceId") ?? undefined) ??
      available[0]?.id;
    if (!available.some((source) => source.id === id))
      throw new CoreError("SOURCE_NOT_FOUND", 404);
    return Response.json({
      item: await collect(config, user, { ...range, sourceId: id }),
    });
  }
  if (path[0] === "reports") {
    if (path.length === 1 && method === "GET")
      return Response.json(
        await config.store.reports(
          user.id,
          reportListInput.parse(Object.fromEntries(url.searchParams)),
        ),
      );
    if (path.length === 1 && method === "POST") {
      const input = reportCreateInput.parse(await request.json());
      const available = await sources(config, user);
      const source = required(
        available.find(
          (source) => source.id === (input.sourceId ?? available[0]?.id),
        ),
      );
      const data = await collect(config, user, {
        ...input.range,
        sourceId: source.id,
      });
      const settings = await config.store.settings();
      const snapshot: ReportSnapshot = {
        version: 1,
        id: randomUUID(),
        title: input.title,
        createdAt: new Date().toISOString(),
        ownerId: user.id,
        range: input.range,
        timeZone: input.timeZone ?? settings.timezone,
        source,
        coverage: data.coverage,
        data,
      };
      return Response.json(
        { item: await config.store.createReport(user.id, snapshot) },
        { status: 201 },
      );
    }
    if (path.length === 2) {
      const id = z.string().uuid().parse(path[1]);
      if (method === "GET")
        return Response.json({
          item: required(await config.store.report(user.id, id)),
        });
      if (method === "DELETE") {
        if (!(await config.store.deleteReport(user.id, id)))
          throw new CoreError("NOT_FOUND", 404);
        return Response.json({ ok: true });
      }
    }
    throw new CoreError("NOT_FOUND", 404);
  }
  return null;
}
