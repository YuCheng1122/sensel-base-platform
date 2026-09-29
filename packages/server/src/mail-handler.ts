import { z } from "zod";
import type { MailSettings } from "@sensel/mail/contracts";
import type { CoreConfig, User } from "./types";
import type { StoredMailSettings } from "./mail-types";
import { CoreError } from "./errors";
import { encryptSecret } from "./secrets";
import { sendConfiguredMail } from "./mail-service";
const settingsInput = z
  .object({
    provider: z.enum(["resend", "fake"]),
    enabled: z.boolean(),
    fromName: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine((value) => !/[<>\r\n]/.test(value)),
    fromEmail: z
      .string()
      .email()
      .max(320)
      .transform((value) => value.toLowerCase()),
    expectedVersion: z.number().int().positive(),
    apiKey: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().min(1).max(8192).optional(),
    ),
  })
  .strict();
function publicSettings(
  settings: StoredMailSettings,
  allowFake: boolean,
): MailSettings {
  return {
    provider: settings.provider,
    enabled: settings.enabled,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    version: settings.version,
    hasApiKey: !!settings.encryptedApiKey,
    allowedProviders: allowFake ? ["resend", "fake"] : ["resend"],
  };
}
export async function handleMail(
  config: CoreConfig,
  user: User,
  path: string[],
  request: Request,
): Promise<Response | null> {
  if (path[0] !== "mail") return null;
  if (user.role !== "ADMIN") throw new CoreError("FORBIDDEN", 403);
  if (path.length !== 2) throw new CoreError("NOT_FOUND", 404);
  if (path[1] === "settings") {
    if (request.method === "GET")
      return Response.json({
        item: publicSettings(
          await config.store.mailSettings(user.id),
          config.allowFakeMail ?? false,
        ),
      });
    if (request.method === "PATCH") {
      const { apiKey, ...input } = settingsInput.parse(await request.json());
      if (input.provider === "fake" && !config.allowFakeMail)
        throw new CoreError(
          "FAKE_MAIL_DISABLED",
          400,
          "Synthetic mail is available only in an explicitly enabled test environment",
        );
      const saved = await config.store.saveMailSettings(user.id, {
        ...input,
        ...(apiKey
          ? { encryptedApiKey: encryptSecret(apiKey, config.encryptionKey) }
          : {}),
      });
      return Response.json({
        item: publicSettings(saved, config.allowFakeMail ?? false),
      });
    }
  }
  if (path[1] === "test" && request.method === "POST") {
    const input = z
      .object({
        to: z.string().email().max(320),
        expectedVersion: z.number().int().positive(),
        idempotencyKey: z.string().uuid(),
      })
      .strict()
      .parse(await request.json());
    return Response.json(
      await sendConfiguredMail(config, user.id, {
        ...input,
        to: [input.to],
        subject: "SenseL mail configuration test",
        text: "This is a controlled SenseL mail configuration test. Provider acceptance does not confirm delivery to your inbox.",
      }),
    );
  }
  if (path[1] === "deliveries" && request.method === "GET") {
    const input = z
      .object({
        page: z.coerce.number().int().min(1).max(100000).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return Response.json(await config.store.mailDeliveries(user.id, input));
  }
  throw new CoreError("NOT_FOUND", 404);
}
