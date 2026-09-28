import assert from "node:assert/strict";
import test from "node:test";
import { streamChat } from "../../packages/server/src/agent-bridge";
import type {
  CoreConfig,
  CoreStore,
  Model,
  User,
} from "../../packages/server/src/types";
const user: User = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "test@example.test",
  name: "Test",
  passwordHash: "unused",
  role: "USER",
  enabled: true,
  version: 1,
  groupIds: [],
};
const model: Model = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Fake",
  provider: "fake",
  model: "fake",
  baseUrl: "",
  encryptedApiKey: null,
  timeoutSeconds: 5,
  maxOutputTokens: 128,
  testedVersion: 1,
  toolsTestedVersion: 1,
  toolsSupported: true,
  enabled: true,
  isDefault: true,
  version: 1,
};
function fixture(failPersistence = false) {
  const messages: {
    role: string;
    content: string;
    status: string;
    trace?: unknown[];
  }[] = [];
  const unsupported = async (): Promise<never> => {
    throw new Error("Unexpected storage operation in stream test");
  };
  const store: CoreStore = {
    userByEmail: unsupported,
    userById: unsupported,
    session: unsupported,
    createSession: unsupported,
    deleteSession: unsupported,
    users: unsupported,
    groups: unsupported,
    saveUser: unsupported,
    saveGroup: unsupported,
    saveModel: unsupported,
    updateProfile: unsupported,
    chats: unsupported,
    createChat: unsupported,
    deleteChat: unsupported,
    recordModelTest: unsupported,
    audit: unsupported,
    health: unsupported,
    settings: unsupported,
    saveSettings: unsupported,
    settingsAudit: unsupported,
    reports: unsupported,
    createReport: unsupported,
    report: unsupported,
    deleteReport: unsupported,
    chat: async () => ({
      id: "chat",
      userId: user.id,
      title: "Test",
      createdAt: new Date(),
      messages: [],
    }),
    models: async () => [model],
    addMessage: async (
      _id: string,
      role: string,
      content: string,
      status: string,
      _executionId?: string,
      trace?: unknown[],
    ) => {
      if (role === "assistant" && failPersistence)
        throw new Error("synthetic database unavailable");
      messages.push({ role, content, status, trace });
    },
  };
  const config: CoreConfig = {
    store,
    encryptionKey: Buffer.alloc(32).toString("base64"),
    agentUrl: "http://synthetic-agent",
    agentSecret: "synthetic-".repeat(4),
    secureCookies: false,
    allowedModelEndpoints: [],
    allowFake: true,
  };
  return { config, messages };
}
function fakeResponse(requestBody: unknown, complete: boolean) {
  const { executionId } = JSON.parse(String(requestBody));
  const events = [
    { v: 1, executionId, type: "run.started" },
    { v: 1, executionId, type: "text.delta", delta: "Partial result" },
    ...(complete
      ? [{ v: 1, executionId, type: "run.completed", status: "completed" }]
      : []),
  ];
  return new Response(events.map((e) => JSON.stringify(e)).join("\n"));
}
const request = (signal?: AbortSignal) =>
  new Request("http://localhost/api/core/chats/chat/messages", {
    method: "POST",
    body: JSON.stringify({ content: "test" }),
    signal,
  });
test("incomplete Agent streams persist partial output and never report completion", async () => {
  const original = globalThis.fetch;
  const { config, messages } = fixture();
  globalThis.fetch = async (_url, init) => fakeResponse(init?.body, false);
  try {
    const response = await streamChat(config, user, "chat", request());
    const body = await response.text();
    assert.match(body, /"status":"partial"/);
    assert.doesNotMatch(body, /"status":"completed"/);
    assert.equal(messages.at(-1)?.content, "Partial result");
    assert.equal(messages.at(-1)?.status, "partial");
  } finally {
    globalThis.fetch = original;
  }
});
test("persistence failures override an upstream success terminal event", async () => {
  const original = globalThis.fetch;
  const { config } = fixture(true);
  globalThis.fetch = async (_url, init) => fakeResponse(init?.body, true);
  try {
    const response = await streamChat(config, user, "chat", request());
    const body = await response.text();
    assert.match(body, /PERSISTENCE_FAILED/);
    assert.doesNotMatch(body, /"status":"completed"/);
  } finally {
    globalThis.fetch = original;
  }
});
test("client cancellation records cancelled status and releases the active run", async () => {
  const original = globalThis.fetch;
  const { config, messages } = fixture();
  const controller = new AbortController();
  globalThis.fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new Error("synthetic abort")),
        { once: true },
      );
    });
  try {
    const response = await streamChat(
      config,
      user,
      "chat",
      request(controller.signal),
    );
    controller.abort();
    const body = await response.text();
    assert.match(body, /"status":"cancelled"/);
    assert.equal(messages.at(-1)?.status, "cancelled");
    globalThis.fetch = async (_url, init) => fakeResponse(init?.body, true);
    const second = await streamChat(config, user, "chat", request());
    assert.match(await second.text(), /"status":"completed"/);
  } finally {
    globalThis.fetch = original;
  }
});
test("failed initial message persistence releases the conversation reservation", async () => {
  const original = globalThis.fetch;
  const { config } = fixture();
  const save = config.store.addMessage;
  let first = true;
  config.store.addMessage = async (...args) => {
    if (first) {
      first = false;
      throw new Error("synthetic insert failure");
    }
    await save(...args);
  };
  globalThis.fetch = async (_url, init) => fakeResponse(init?.body, true);
  try {
    await assert.rejects(
      () => streamChat(config, user, "chat", request()),
      /synthetic insert failure/,
    );
    const response = await streamChat(config, user, "chat", request());
    assert.match(await response.text(), /"status":"completed"/);
  } finally {
    globalThis.fetch = original;
  }
});
test("concurrent model lookups cannot start two runs in the same conversation", async () => {
  const original = globalThis.fetch;
  const { config } = fixture();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let lookups = 0;
  config.store.models = async () => {
    lookups++;
    if (lookups === 2) release();
    await gate;
    return [model];
  };
  let finish!: () => void;
  const upstreamGate = new Promise<void>((resolve) => {
    finish = resolve;
  });
  globalThis.fetch = async (_url, init) => {
    await upstreamGate;
    return fakeResponse(init?.body, true);
  };
  try {
    const results = await Promise.allSettled([
      streamChat(config, user, "chat", request()),
      streamChat(config, user, "chat", request()),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const rejection = results.find((r) => r.status === "rejected");
    assert.equal(
      rejection?.status === "rejected" ? rejection.reason.code : null,
      "CHAT_BUSY",
    );
    finish();
    for (const result of results)
      if (result.status === "fulfilled") await result.value.text();
  } finally {
    finish();
    globalThis.fetch = original;
  }
});
