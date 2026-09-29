import { Prisma, type PrismaClient } from "@prisma/client";
import {
  CoreError,
  defaultMailSettings,
  type MailStore,
  type StoredMailSettings,
} from "@sensel/server";
import type { MailDelivery, MailState } from "@sensel/mail/contracts";
import { admin } from "./prisma-authorization";
const config = (
  row: Omit<StoredMailSettings, "provider"> & { provider: string },
): StoredMailSettings => ({
  provider: row.provider as StoredMailSettings["provider"],
  enabled: row.enabled,
  fromName: row.fromName,
  fromEmail: row.fromEmail,
  encryptedApiKey: row.encryptedApiKey,
  version: row.version,
});
const publicConfig = (row: StoredMailSettings) => {
  const { encryptedApiKey, ...fields } = row;
  return { ...fields, hasApiKey: !!encryptedApiKey };
};
const delivery = (row: {
  id: string;
  idempotencyKey: string;
  actorId: string;
  to: string[];
  subject: string;
  configVersion: number;
  state: string;
  providerMessageId: string | null;
  errorCode: string | null;
  synthetic: boolean;
  createdAt: Date;
  updatedAt: Date;
}): MailDelivery => ({
  id: row.id,
  idempotencyKey: row.idempotencyKey,
  actorId: row.actorId,
  to: row.to,
  subject: row.subject,
  configVersion: row.configVersion,
  state: row.state as MailState,
  providerMessageId: row.providerMessageId,
  errorCode: row.errorCode,
  synthetic: row.synthetic,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
export function createMailStore(db: PrismaClient): MailStore {
  return {
    async mailSettings(actorId) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const row = await tx.mailConfiguration.findUnique({
          where: { id: "mail" },
        });
        return row ? config(row) : { ...defaultMailSettings };
      });
    },
    async saveMailSettings(actorId, input) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const row = await tx.mailConfiguration.findUnique({
          where: { id: "mail" },
        });
        const before = row ? config(row) : { ...defaultMailSettings };
        if (before.version !== input.expectedVersion)
          throw new CoreError(
            "VERSION_CONFLICT",
            409,
            "Mail settings changed; reload before saving",
          );
        const { expectedVersion, ...fields } = input;
        if (
          fields.enabled &&
          fields.provider === "resend" &&
          !fields.encryptedApiKey &&
          !before.encryptedApiKey
        )
          throw new CoreError("API_KEY_REQUIRED", 400);
        const after = config(
          await tx.mailConfiguration.upsert({
            where: { id: "mail" },
            create: { id: "mail", ...fields, version: expectedVersion + 1 },
            update: { ...fields, version: expectedVersion + 1 },
          }),
        );
        await tx.mailSettingsAudit.create({
          data: {
            actorId,
            before: publicConfig(before),
            after: publicConfig(after),
            secretChanged: fields.encryptedApiKey !== undefined,
          },
        });
        return after;
      });
    },
    async reserveMail(actorId, message, fingerprint) {
      return db.$transaction(async (tx) => {
        await admin(tx, actorId);
        const prior = await tx.mailDelivery.findUnique({
          where: { idempotencyKey: message.idempotencyKey },
        });
        if (prior) {
          if (prior.fingerprint !== fingerprint || prior.actorId !== actorId)
            throw new CoreError(
              "IDEMPOTENCY_CONFLICT",
              409,
              "This key already belongs to a different message",
            );
          return { delivery: delivery(prior), claimed: false, replayed: true };
        }
        const row = await tx.mailConfiguration.findUnique({
          where: { id: "mail" },
        });
        const current = row ? config(row) : defaultMailSettings;
        const errorCode =
          current.version !== message.expectedVersion
            ? "CONFIGURATION_CHANGED"
            : !current.enabled
              ? "MAIL_DISABLED"
              : "IN_PROGRESS_OR_INTERRUPTED";
        const claimed = errorCode === "IN_PROGRESS_OR_INTERRUPTED";
        const record = await tx.mailDelivery.create({
          data: {
            idempotencyKey: message.idempotencyKey,
            fingerprint,
            actorId,
            to: message.to,
            subject: message.subject,
            configVersion: message.expectedVersion,
            state: claimed ? "unknown" : "cancelled",
            errorCode,
            synthetic: current.provider === "fake",
          },
        });
        return { delivery: delivery(record), claimed, replayed: false };
      });
    },
    async completeMail(id, result) {
      return db.$transaction(async (tx) => {
        await tx.mailDelivery.updateMany({
          where: { id, errorCode: "IN_PROGRESS_OR_INTERRUPTED" },
          data: {
            state: result.state,
            errorCode: result.errorCode ?? null,
            providerMessageId: result.providerMessageId ?? null,
            synthetic: result.synthetic ?? false,
          },
        });
        const row = await tx.mailDelivery.findUnique({ where: { id } });
        if (!row) throw new CoreError("NOT_FOUND", 404);
        return delivery(row);
      });
    },
    async mailDeliveries(actorId, input) {
      return db.$transaction(
        async (tx) => {
          await admin(tx, actorId);
          const [rows, total] = await Promise.all([
            tx.mailDelivery.findMany({
              orderBy: [{ createdAt: "desc" }, { id: "desc" }],
              skip: (input.page - 1) * input.pageSize,
              take: input.pageSize,
            }),
            tx.mailDelivery.count(),
          ]);
          return { items: rows.map(delivery), total, ...input };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      );
    },
  };
}
