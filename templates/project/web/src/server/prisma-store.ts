import { createMailStore } from "./prisma-mail-store";
import { admin } from "./prisma-authorization";
import { createFeatureStore } from "./prisma-feature-store";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  CoreError,
  type CoreStore,
  type User,
  type Model,
} from "@sensel/server";
type Tx = Prisma.TransactionClient;
const mapUser = (u: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  enabled: boolean;
  version: number;
  groups: { id: string }[];
}): User => {
  const { groups, ...fields } = u;
  return {
    ...fields,
    role: u.role as User["role"],
    groupIds: groups.map((g) => g.id),
  };
};
const mapModel = (
  m: { provider: string } & Omit<Model, "provider">,
): Model => ({ ...m, provider: m.provider as Model["provider"] });
function version(current: { version: number } | null, expected?: number) {
  if (!current) throw new CoreError("NOT_FOUND", 404);
  if (current.version !== expected)
    throw new CoreError("VERSION_CONFLICT", 409);
}
const audit = (tx: Tx, actorId: string, action: string, targetId: string) =>
  tx.auditEvent.create({ data: { actorId, action, targetId } });
export function createPrismaStore(db: PrismaClient): CoreStore {
  return {
    ...createFeatureStore(db),
    ...createMailStore(db),
    async userByEmail(email) {
      const u = await db.user.findUnique({
        where: { email },
        include: { groups: true },
      });
      return u ? mapUser(u) : null;
    },
    async userById(id) {
      const u = await db.user.findUnique({
        where: { id },
        include: { groups: true },
      });
      return u ? mapUser(u) : null;
    },
    async session(tokenHash) {
      const s = await db.session.findUnique({
        where: { tokenHash },
        include: { user: { include: { groups: true } } },
      });
      return s ? { user: mapUser(s.user), expiresAt: s.expiresAt } : null;
    },
    async createSession(tokenHash, userId, expiresAt) {
      await db.session.create({ data: { tokenHash, userId, expiresAt } });
    },
    async deleteSession(tokenHash) {
      await db.session.deleteMany({ where: { tokenHash } });
    },
    async users() {
      return (
        await db.user.findMany({
          include: { groups: true },
          orderBy: { email: "asc" },
          take: 500,
        })
      ).map(mapUser);
    },
    async groups() {
      return db.group.findMany({ orderBy: { name: "asc" }, take: 500 });
    },
    async models() {
      return (
        await db.modelConnection.findMany({
          orderBy: { name: "asc" },
          take: 100,
        })
      ).map(mapModel);
    },
    async saveUser(actorId, data) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const { id, expectedVersion, groupIds, ...fields } = data;
        if (id) {
          const current = await tx.user.findUnique({ where: { id } });
          version(current, expectedVersion);
          if (
            current?.role === "ADMIN" &&
            current.enabled &&
            (fields.role === "USER" || fields.enabled === false) &&
            (await tx.user.count({
              where: { role: "ADMIN", enabled: true },
            })) <= 1
          )
            throw new CoreError("LAST_ADMIN", 409);
        }
        const groups = { set: groupIds?.map((id) => ({ id })) };
        const row = id
          ? await tx.user.update({
              where: { id },
              data: { ...fields, version: { increment: 1 }, groups },
              include: { groups: true },
            })
          : await tx.user.create({
              data: {
                email: fields.email!,
                name: fields.name!,
                passwordHash: fields.passwordHash!,
                role: fields.role,
                enabled: fields.enabled,
                groups: { connect: groupIds?.map((id) => ({ id })) },
              },
              include: { groups: true },
            });
        if (id && (fields.passwordHash || fields.enabled === false))
          await tx.session.deleteMany({ where: { userId: id } });
        await audit(tx, actorId, id ? "user.updated" : "user.created", row.id);
        return mapUser(row);
      });
    },
    async saveGroup(actorId, data) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const { id, expectedVersion, ...fields } = data;
        if (id)
          version(
            await tx.group.findUnique({ where: { id } }),
            expectedVersion,
          );
        const row = id
          ? await tx.group.update({
              where: { id },
              data: { ...fields, version: { increment: 1 } },
            })
          : await tx.group.create({
              data: { name: fields.name!, description: fields.description },
            });
        await audit(
          tx,
          actorId,
          id ? "group.updated" : "group.created",
          row.id,
        );
        return row;
      });
    },
    async saveModel(actorId, data) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const { id, expectedVersion, ...fields } = data;
        const current = id
          ? await tx.modelConnection.findUnique({ where: { id } })
          : null;
        if (id) version(current, expectedVersion);
        const changed =
          !current ||
          (
            [
              "provider",
              "model",
              "baseUrl",
              "encryptedApiKey",
              "timeoutSeconds",
              "maxOutputTokens",
            ] as const
          ).some(
            (key) => fields[key] !== undefined && fields[key] !== current[key],
          );
        if (
          fields.isDefault &&
          (!current ||
            changed ||
            current.testedVersion !== current.version ||
            current.toolsTestedVersion !== current.version ||
            !current.toolsSupported ||
            fields.enabled === false)
        )
          throw new CoreError(
            "TEST_REQUIRED",
            409,
            "Pass connection and tools checks before setting a default model",
          );
        const nextVersion = (current?.version ?? 0) + 1;
        const testing = changed
          ? {
              testedVersion: null,
              toolsTestedVersion: null,
              toolsSupported: null,
            }
          : {
              testedVersion:
                current?.testedVersion === current?.version
                  ? nextVersion
                  : null,
              toolsTestedVersion:
                current?.toolsTestedVersion === current?.version
                  ? nextVersion
                  : null,
            };
        if (fields.isDefault)
          await tx.modelConnection.updateMany({
            where: { isDefault: true, ...(id ? { id: { not: id } } : {}) },
            data: {
              isDefault: false,
              version: { increment: 1 },
              testedVersion: { increment: 1 },
              toolsTestedVersion: { increment: 1 },
            },
          });
        const row = id
          ? await tx.modelConnection.update({
              where: { id },
              data: {
                ...fields,
                ...testing,
                ...(changed || fields.enabled === false
                  ? { isDefault: false }
                  : {}),
                version: { increment: 1 },
              },
            })
          : await tx.modelConnection.create({
              data: {
                name: fields.name!,
                provider: fields.provider!,
                model: fields.model!,
                baseUrl: fields.baseUrl,
                encryptedApiKey: fields.encryptedApiKey,
                timeoutSeconds: fields.timeoutSeconds,
                maxOutputTokens: fields.maxOutputTokens,
                enabled: fields.enabled,
                isDefault: fields.isDefault,
              },
            });
        await audit(
          tx,
          actorId,
          id ? "model.updated" : "model.created",
          row.id,
        );
        return mapModel(row);
      });
    },
    async updateProfile(userId, name, passwordHash) {
      return db.$transaction(async (tx) => {
        const actor = await tx.user.findUnique({ where: { id: userId } });
        if (!actor?.enabled) throw new CoreError("UNAUTHORIZED", 401);
        const row = await tx.user.update({
          where: { id: userId },
          data: {
            name,
            ...(passwordHash ? { passwordHash } : {}),
            version: { increment: 1 },
          },
          include: { groups: true },
        });
        if (passwordHash) await tx.session.deleteMany({ where: { userId } });
        await audit(tx, userId, "profile.updated", userId);
        return mapUser(row);
      });
    },
    async chats(userId) {
      return db.chat.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    },
    async chat(userId, id) {
      const row = await db.chat.findFirst({
        where: { id, userId },
        include: {
          messages: {
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: 500,
          },
        },
      });
      return row ? { ...row, messages: row.messages.reverse() } : null;
    },
    async createChat(userId, title) {
      return db.chat.create({ data: { userId, title } });
    },
    async deleteChat(userId, id) {
      await db.chat.deleteMany({ where: { id, userId } });
    },
    async addMessage(chatId, role, content, status, executionId, trace = []) {
      await db.chatMessage.create({
        data: {
          chatId,
          role,
          content,
          status,
          executionId,
          trace: trace as Prisma.InputJsonValue,
        },
      });
    },
    async recordModelTest(id, version, result) {
      const update = await db.modelConnection.updateMany({
        where: { id, version },
        data: {
          ...(result.mode === "connection"
            ? { testedVersion: result.ok ? version : null }
            : {
                toolsSupported: result.ok,
                toolsTestedVersion: result.ok ? version : null,
              }),
          ...(!result.ok ? { isDefault: false } : {}),
        },
      });
      if (update.count !== 1)
        throw new CoreError(
          "VERSION_CONFLICT",
          409,
          "Model changed while the check was running",
        );
    },
    async audit(actorId, action, targetId) {
      await audit(db, actorId, action, targetId);
    },
    async health() {
      await db.$queryRaw`SELECT 1`;
    },
  };
}
