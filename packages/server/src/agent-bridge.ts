import { randomUUID } from "node:crypto";
import { z } from "zod";
import { CoreError, required } from "./errors";
import { decryptSecret, signProfile } from "./secrets";
import type { CoreConfig, Model, User } from "./types";
export function profile(
  config: CoreConfig,
  user: User,
  model: Model,
  executionId: string,
  deadlineMs = Date.now() + 120_000,
  timeContext?: { now: string; timezone: string; defaultRangeDays: number },
) {
  return signProfile(
    {
      v: 1,
      sub: user.id,
      executionId,
      deadlineMs,
      ...(timeContext ? {timeContext} : {}),
      exp: Math.floor(Date.now() / 1000) + 300,
      model: {
        provider: model.provider,
        model: model.model,
        baseUrl: model.baseUrl || undefined,
        apiKey: model.encryptedApiKey
          ? decryptSecret(model.encryptedApiKey, config.encryptionKey)
          : undefined,
        timeoutSeconds: model.timeoutSeconds,
        maxOutputTokens: model.maxOutputTokens,
      },
      tools: config.tools ?? [],
    },
    config.agentSecret,
  );
}
export async function agentFetch(
  config: CoreConfig,
  path: string,
  body: unknown,
  signal?: AbortSignal,
) {
  return fetch(`${config.agentUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.agentSecret}`,
    },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(130000),
  });
}
const runs = new Map<
  string,
  { userId: string; chatId: string; controller: AbortController }
>();
export function assertChatsIdle(userId: string, chatId?: string) {
  if ([...runs.values()].some(run => run.userId === userId && (!chatId || run.chatId === chatId)))
    throw new CoreError("CHAT_BUSY", 409, "對話執行中，請先停止後再編輯或刪除。");
}
export async function cancelRun(
  config: CoreConfig,
  user: User,
  chatId: string,
  request: Request,
) {
  const { executionId } = z
    .object({ executionId: z.string().uuid() })
    .parse(await request.json());
  const run = runs.get(executionId);
  if (!run || run.userId !== user.id || run.chatId !== chatId)
    throw new CoreError("NOT_FOUND", 404);
  try {
    await agentFetch(
      config,
      `/v1/runs/${executionId}/cancel`,
      {},
      AbortSignal.timeout(5000),
    );
  } finally {
    run.controller.abort();
  }
  return Response.json({ item: { executionId, status: "cancelling" } });
}
export async function streamChat(
  config: CoreConfig,
  user: User,
  chatId: string,
  request: Request,
) {
  const { content, modelId } = z
    .object({
      content: z.string().trim().min(1).max(32000),
      modelId: z.string().uuid().optional(),
    })
    .parse(await request.json());
  const chat = required(await config.store.chat(user.id, chatId));
  const history = (chat.messages ?? [])
    .filter((message) => message.status === "completed")
    .slice(-40);
  if (history.some((message) => message.content.length > 32000))
    throw new CoreError(
      "HISTORY_TOO_LARGE",
      400,
      "此對話包含超過模型歷史長度限制的回覆。內容已完整保存，請開啟新對話繼續。",
    );
  if ([...runs.values()].some((r) => r.chatId === chatId))
    throw new CoreError("CHAT_BUSY", 409);
  const models = await config.store.models();
  const model = required(
    models.find((m) => m.enabled && (modelId ? m.id === modelId : m.isDefault)),
  );
  if (model.provider === "fake" && !config.allowFake)
    throw new CoreError("FAKE_DISABLED", 400);
  const deadlineMs = Date.now() + 120_000;
  const executionId = randomUUID(),
    controller = new AbortController();
  if ([...runs.values()].some((r) => r.chatId === chatId))
    throw new CoreError("CHAT_BUSY", 409);
  runs.set(executionId, { userId: user.id, chatId, controller });
  try {
    await config.store.addMessage(
      chatId,
      "user",
      content,
      "completed",
      executionId,
    );
  } catch (error) {
    runs.delete(executionId);
    throw error;
  }
  const encoder = new TextEncoder();
  let result = "",
    terminal = false,
    status = "error";
  let timedOut = false;
  const trace: unknown[] = [];
  const stream = new ReadableStream<Uint8Array>({
    async start(output) {
      const emit = (event: unknown) => {
        try {
          output.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          controller.abort();
        }
      };
      const disconnected = () => controller.abort();
      request.signal.addEventListener("abort", disconnected);
      if (request.signal.aborted) controller.abort();
      const timer = setTimeout(
        () => { timedOut = true; controller.abort(); },
        Math.max(0, deadlineMs + 5_000 - Date.now()),
      );
      try {
        const settings = await config.store.settings();
        const upstream = await agentFetch(
          config,
          "/v1/runs",
          {
            executionId,
            conversationId: chatId,
            message: content,
            messages: history.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            profileToken: profile(config, user, model, executionId, deadlineMs, {now: new Date().toISOString(), timezone: settings.timezone, defaultRangeDays: settings.defaultRangeDays}),
          },
          controller.signal,
        );
        if (!upstream.ok || !upstream.body)
          throw new Error("AGENT_UNAVAILABLE");
        const reader = upstream.body.getReader(),
          decoder = new TextDecoder();
        let buffer = "";
        const process = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as Record<string, unknown>;
          if (terminal) throw new Error("EVENT_AFTER_TERMINAL");
          if (event.executionId !== executionId)
            throw new Error("INVALID_EXECUTION");
          if (event.type === "text.delta" && typeof event.delta === "string")
            result += event.delta;
          if (event.type === "run.completed") {
            if (
              !["completed", "error", "cancelled", "partial"].includes(
                String(event.status),
              )
            )
              throw new Error("INVALID_STATUS");
            terminal = true;
            status = String(event.status);
            trace.push(event);
            return;
          }
          if (event.type !== "text.delta") trace.push(event);
          emit(event);
        };
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          if (buffer.length > 1000000) throw new Error("EVENT_TOO_LARGE");
          let index;
          while ((index = buffer.indexOf("\n")) !== -1) {
            process(buffer.slice(0, index));
            buffer = buffer.slice(index + 1);
          }
        }
        if (buffer.trim()) process(buffer);
        if (!terminal) throw new Error("INCOMPLETE_STREAM");
      } catch {
        status = timedOut ? "partial" : controller.signal.aborted
          ? "cancelled"
          : result
            ? "partial"
            : "error";
        trace.push({
          v: 1,
          type: "run.completed",
          executionId,
          status,
          error: {
            code: timedOut ? "EXECUTION_TIMEOUT" : status === "cancelled" ? "CANCELLED" : "AGENT_FAILURE",
            message:
              timedOut ? "Execution time limit reached" : status === "cancelled"
                ? "Run cancelled"
                : "Agent did not complete the response",
          },
        });
      } finally {
        clearTimeout(timer);
        request.signal.removeEventListener("abort", disconnected);
        try {
          await config.store.addMessage(
            chatId,
            "assistant",
            result,
            status,
            executionId,
            trace,
          );
          emit(trace.at(-1));
        } catch {
          emit({
            v: 1,
            type: "run.completed",
            executionId,
            status: "error",
            error: {
              code: "PERSISTENCE_FAILED",
              message: "Response could not be saved",
            },
          });
        }
        runs.delete(executionId);
        try {
          output.close();
        } catch {
          /* Client has disconnected. */
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
