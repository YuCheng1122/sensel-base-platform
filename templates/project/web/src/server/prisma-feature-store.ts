import { Prisma, type PrismaClient } from "@prisma/client";
import {
  CoreError,
  defaultPlatformSettings,
  type FeatureStore,
  type PlatformSettings,
} from "@sensel/server";
import type { ReportSnapshot } from "@sensel/reports/contracts";
import { admin } from "./prisma-authorization";
const settingsFields = ({
  name,
  timezone,
  reportTitle,
  defaultRangeDays,
  version,
}: PlatformSettings): PlatformSettings => ({
  name,
  timezone,
  reportTitle,
  defaultRangeDays,
  version,
});
const snapshot = (value: Prisma.JsonValue) =>
  value as unknown as ReportSnapshot;
export function createFeatureStore(db: PrismaClient): FeatureStore {
  return {
    async settings() {
      const row = await db.platformSettings.findUnique({
        where: { id: "platform" },
      });
      return row ? settingsFields(row) : { ...defaultPlatformSettings };
    },
    async saveSettings(actorId, input) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const row = await tx.platformSettings.findUnique({
          where: { id: "platform" },
        });
        const before = row
          ? settingsFields(row)
          : { ...defaultPlatformSettings };
        if (before.version !== input.expectedVersion)
          throw new CoreError(
            "VERSION_CONFLICT",
            409,
            "Settings changed; reload before saving",
          );
        const { expectedVersion, ...fields } = input;
        const after = settingsFields(
          await tx.platformSettings.upsert({
            where: { id: "platform" },
            create: { id: "platform", ...fields, version: expectedVersion + 1 },
            update: { ...fields, version: expectedVersion + 1 },
          }),
        );
        await tx.platformSettingsAudit.create({
          data: { actorId, before: { ...before }, after: { ...after } },
        });
        return after;
      });
    },
    async settingsAudit(actorId, cursor) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        if (
          cursor &&
          !(await tx.platformSettingsAudit.findUnique({
            where: { id: cursor },
          }))
        )
          throw new CoreError("INVALID_CURSOR", 400);
        const rows = await tx.platformSettingsAudit.findMany({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 51,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        const items = rows
          .slice(0, 50)
          .map((row) => ({
            id: row.id,
            actorId: row.actorId,
            createdAt: row.createdAt.toISOString(),
            before: row.before as unknown as PlatformSettings,
            after: row.after as unknown as PlatformSettings,
          }));
        return {
          items,
          ...(rows.length > 50 ? { nextCursor: items.at(-1)!.id } : {}),
        };
      });
    },
    async reports(ownerId, input) {
      const where = {
        ownerId,
        ...(input.query
          ? { title: { contains: input.query, mode: "insensitive" as const } }
          : {}),
      };
      const [rows, total] = await db.$transaction(
        [
          db.reportSnapshot.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (input.page - 1) * input.pageSize,
            take: input.pageSize,
          }),
          db.reportSnapshot.count({ where }),
        ],
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
      return {
        items: rows.map((row) => {
          const {
            data: _data,
            sections: _sections,
            ...summary
          } = snapshot(row.snapshot);
          return summary;
        }),
        total,
        page: input.page,
        pageSize: input.pageSize,
      };
    },
    async createReport(ownerId, data) {
      return db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: ownerId } });
        if (!user?.enabled) throw new CoreError("UNAUTHORIZED", 401);
        if (data.ownerId !== ownerId) throw new CoreError("FORBIDDEN", 403);
        const row = await tx.reportSnapshot.create({
          data: {
            id: data.id,
            ownerId,
            title: data.title,
            createdAt: new Date(data.createdAt),
            snapshot: data as unknown as Prisma.InputJsonValue,
          },
        });
        await tx.auditEvent.create({
          data: {
            actorId: ownerId,
            action: "report.created",
            targetId: data.id,
          },
        });
        return snapshot(row.snapshot);
      });
    },
    async report(ownerId, id) {
      const row = await db.reportSnapshot.findFirst({ where: { id, ownerId } });
      return row ? snapshot(row.snapshot) : null;
    },
    async deleteReport(ownerId, id) {
      return db.$transaction(async (tx) => {
        const result = await tx.reportSnapshot.deleteMany({
          where: { id, ownerId },
        });
        if (result.count)
          await tx.auditEvent.create({
            data: { actorId: ownerId, action: "report.deleted", targetId: id },
          });
        return result.count === 1;
      });
    },
  };
}
