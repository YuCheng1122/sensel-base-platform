import type { MailTransport } from "./contracts";

const MAX_RESPONSE_BYTES = 128 * 1024;
async function readReceipt(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      const value = chunk.value;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("response_limit");
      }
      chunks.push(value);
      chunk = await reader.read();
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
/** Native fetch adapter. Endpoint and redirect policy cannot be overridden by configuration. */
export function createResendTransport(
  options: {
    fetch?: typeof fetch;
    timeoutMs?: number;
  } = {},
): MailTransport {
  const fetcher = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 14_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
    throw new Error("Invalid mail timeout");
  return {
    async send(config, message, signal) {
      if (signal?.aborted)
        return { state: "cancelled", errorCode: "cancelled_before_send" };
      if (!config.apiKey)
        return { state: "rejected", errorCode: "missing_api_key" };
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const interrupted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(new Error("interrupted")),
          { once: true },
        );
        timer = setTimeout(abort, timeoutMs);
      });
      try {
        const operation = async () => {
          const response = await fetcher("https://api.resend.com/emails", {
            method: "POST",
            redirect: "error",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json",
              "Idempotency-Key": message.idempotencyKey,
            },
            body: JSON.stringify({
              from: config.from,
              to: message.to,
              subject: message.subject,
              text: message.text,
              html: message.html,
            }),
          });
          if (!response.ok) {
            await response.body?.cancel();
            return {
              state:
                response.status >= 400 &&
                response.status < 500 &&
                response.status !== 408 &&
                response.status !== 409
                  ? ("rejected" as const)
                  : ("unknown" as const),
              errorCode: `provider_http_${response.status}`,
            };
          }
          const body = await readReceipt(response, controller.signal);
          if (
            body &&
            typeof body === "object" &&
            "id" in body &&
            typeof body.id === "string" &&
            /^[a-zA-Z0-9_-]{1,128}$/.test(body.id)
          )
            return { state: "accepted" as const, providerMessageId: body.id };
          return {
            state: "unknown" as const,
            errorCode: "invalid_provider_receipt",
          };
        };
        return await Promise.race([operation(), interrupted]);
      } catch {
        return {
          state: "unknown",
          errorCode: controller.signal.aborted
            ? "interrupted_after_dispatch"
            : "provider_result_unconfirmed",
        };
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
    },
  };
}
