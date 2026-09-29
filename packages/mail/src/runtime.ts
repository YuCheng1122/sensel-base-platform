import type {
  MailMessage,
  MailResult,
  MailRuntimeConfig,
  MailTransport,
} from "./contracts";
import { createResendTransport } from "./resend";

const resend = createResendTransport();
const address = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
function validMessage(
  config: MailRuntimeConfig,
  message: MailMessage,
): boolean {
  const sender = config.from.includes("<")
    ? config.from.match(/^[^<>\r\n]+ <([^<>\s]+)>$/)?.[1]
    : config.from;
  return Boolean(
    sender &&
      address.test(sender) &&
      !/[\r\n]/.test(config.from) &&
      message.to.length > 0 &&
      message.to.length <= 50 &&
      message.to.every((value) => address.test(value)) &&
      message.subject.trim() &&
      message.subject.length <= 998 &&
      !/[\r\n]/.test(message.subject) &&
      (message.text?.trim() || message.html?.trim()) &&
      (message.text?.length ?? 0) + (message.html?.length ?? 0) <= 1_000_000 &&
      /^[A-Za-z0-9._:-]{1,256}$/.test(message.idempotencyKey),
  );
}
/** Customer server entry point; persistent reservation and current configuration lookup belong to the caller. */
export async function sendMail(
  config: MailRuntimeConfig,
  message: MailMessage,
  options: {
    signal?: AbortSignal;
    transport?: MailTransport;
    /** Caller must derive this from explicit test/development environment AND opt-in. */
    allowFake?: boolean;
  } = {},
): Promise<MailResult> {
  if (options.signal?.aborted)
    return { state: "cancelled", errorCode: "cancelled_before_send" };
  if (config.version !== message.expectedVersion)
    return { state: "cancelled", errorCode: "configuration_changed" };
  if (!config.enabled)
    return { state: "cancelled", errorCode: "mail_disabled" };
  if (!validMessage(config, message))
    return { state: "rejected", errorCode: "invalid_message" };
  if (config.provider === "fake") {
    if (!options.allowFake)
      return { state: "rejected", errorCode: "synthetic_mail_disabled" };
    return {
      state: "accepted",
      providerMessageId: `synthetic-${message.idempotencyKey}`,
      synthetic: true,
    };
  }
  if (config.provider !== "resend")
    return { state: "rejected", errorCode: "unsupported_provider" };
  try {
    return await (options.transport ?? resend).send(
      config,
      message,
      options.signal,
    );
  } catch {
    return { state: "unknown", errorCode: "transport_result_unconfirmed" };
  }
}
