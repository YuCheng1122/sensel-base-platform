import { createHmac } from "node:crypto";
import { sendMail } from "@sensel/mail";
import type { MailMessage, MailResult } from "@sensel/mail/contracts";
import { z } from "zod";
import type { CoreConfig } from "./types";
import { CoreError } from "./errors";
import { decryptSecret } from "./secrets";
const messageInput = z
  .object({
    to: z
      .array(
        z
          .string()
          .email()
          .max(320)
          .transform((email) => email.toLowerCase()),
      )
      .min(1)
      .max(10),
    subject: z
      .string()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value)),
    text: z.string().max(64000).optional(),
    html: z.string().max(128000).optional(),
    expectedVersion: z.number().int().positive(),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .refine((value) => !!(value.text || value.html), "Mail content required");
/** Durable reservation precedes I/O. Replays never re-send, including unknown outcomes. */
export async function sendConfiguredMail(
  config: CoreConfig,
  actorId: string,
  input: MailMessage,
) {
  const message = messageInput.parse(input);
  const key = Buffer.from(config.encryptionKey, "base64");
  if (key.length !== 32) throw new CoreError("CONFIGURATION_ERROR", 503);
  const fingerprint = createHmac("sha256", key)
    .update("sensel-mail-v1\0")
    .update(JSON.stringify({ actorId, ...message }))
    .digest("hex");
  const reservation = await config.store.reserveMail(
    actorId,
    message,
    fingerprint,
  );
  if (!reservation.claimed)
    return { item: reservation.delivery, replayed: reservation.replayed };
  let result: MailResult;
  try {
    const current = await config.store.mailSettings(actorId);
    result = await sendMail(
      {
        version: current.version,
        enabled: current.enabled,
        provider: current.provider,
        from: current.fromName
          ? `${current.fromName} <${current.fromEmail}>`
          : current.fromEmail,
        apiKey: current.encryptedApiKey
          ? decryptSecret(current.encryptedApiKey, config.encryptionKey)
          : undefined,
      },
      message,
      {
        allowFake: config.allowFakeMail ?? false,
        transport: config.mailTransport,
      },
    );
  } catch (error) {
    result = {
      state:
        error instanceof CoreError &&
        ["FORBIDDEN", "UNAUTHORIZED"].includes(error.code)
          ? "cancelled"
          : "unknown",
      errorCode:
        error instanceof CoreError &&
        ["FORBIDDEN", "UNAUTHORIZED"].includes(error.code)
          ? "AUTHORIZATION_CHANGED"
          : "SEND_UNCONFIRMED",
    };
  }
  try {
    return {
      item: await config.store.completeMail(reservation.delivery.id, {
        ...result,
        synthetic: result.synthetic ?? reservation.delivery.synthetic,
      }),
      replayed: false,
    };
  } catch {
    return {
      item: {
        ...reservation.delivery,
        state: "unknown" as const,
        errorCode: "RECEIPT_PERSISTENCE_FAILED",
      },
      replayed: false,
    };
  }
}
