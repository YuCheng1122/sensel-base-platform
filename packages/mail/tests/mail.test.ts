import assert from "node:assert/strict";
import test from "node:test";
import {
  createResendTransport,
  sendMail,
  type MailMessage,
  type MailRuntimeConfig,
} from "../src/index";
const config: MailRuntimeConfig = {
  version: 3,
  enabled: true,
  provider: "resend",
  from: "Service <service@example.invalid>",
  apiKey: "synthetic-key",
};
const message: MailMessage = {
  to: ["recipient@example.invalid"],
  subject: "Synthetic test",
  text: "No real email",
  expectedVersion: 3,
  idempotencyKey: "tenant1:notice1",
};

test("Resend accepts receipt without claiming delivery; fixed endpoint, body and idempotency header", async () => {
  let calls = 0;
  const transport = createResendTransport({
    fetch: async (url, options) => {
      calls++;
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal(options?.redirect, "error");
      assert.equal(
        new Headers(options?.headers).get("Idempotency-Key"),
        message.idempotencyKey,
      );
      assert.deepEqual(JSON.parse(String(options?.body)), {
        from: config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return Response.json({ id: "receipt_123" });
    },
  });
  assert.deepEqual(await sendMail(config, message, { transport }), {
    state: "accepted",
    providerMessageId: "receipt_123",
  });
  assert.equal(calls, 1);
});
test("version, enabled, validation and pre-abort block dispatch", async () => {
  let calls = 0;
  const transport = {
    send: async () => {
      calls++;
      return { state: "accepted" as const };
    },
  };
  assert.equal(
    (await sendMail(config, { ...message, expectedVersion: 2 }, { transport }))
      .state,
    "cancelled",
  );
  assert.equal(
    (await sendMail({ ...config, enabled: false }, message, { transport }))
      .state,
    "cancelled",
  );
  assert.equal(
    (
      await sendMail(config, message, {
        transport,
        signal: AbortSignal.abort(),
      })
    ).state,
    "cancelled",
  );
  for (const bad of [
    { subject: "bad\r\nBcc: x" },
    { to: ["x@example.invalid\n"] },
    { idempotencyKey: "bad\nkey" },
    { text: "", html: "" },
  ])
    assert.equal(
      (await sendMail(config, { ...message, ...bad }, { transport })).state,
      "rejected",
    );
  assert.equal(calls, 0);
});
test("HTTP rejection vs ambiguous results never retried and never expose response secrets", async () => {
  for (const [status, expected] of [
    [400, "rejected"],
    [401, "rejected"],
    [429, "rejected"],
    [408, "unknown"],
    [409, "unknown"],
    [500, "unknown"],
  ] as const) {
    let calls = 0;
    const result = await sendMail(config, message, {
      transport: createResendTransport({
        fetch: async () => {
          calls++;
          return new Response("secret-provider-error", { status });
        },
      }),
    });
    assert.equal(result.state, expected);
    assert.equal(calls, 1);
    assert.ok(!JSON.stringify(result).includes("secret"));
  }
  for (const response of [
    Response.json({}),
    new Response("not JSON"),
    new Response("x".repeat(128 * 1024 + 1)),
  ]) {
    assert.equal(
      (
        await sendMail(config, message, {
          transport: createResendTransport({ fetch: async () => response }),
        })
      ).state,
      "unknown",
    );
  }
});
test("timeout and abort after dispatch stay unknown without retry", async () => {
  let calls = 0;
  const controller = new AbortController();
  const transport = createResendTransport({
    timeoutMs: 10,
    fetch: async () => {
      calls++;
      return new Promise<Response>(() => {});
    },
  });
  assert.equal(
    (await sendMail(config, message, { transport })).state,
    "unknown",
  );
  const pending = sendMail(config, message, {
    transport,
    signal: controller.signal,
  });
  controller.abort();
  assert.equal((await pending).state, "unknown");
  assert.equal(calls, 2);
});
test("synthetic mode requires explicit opt-in and performs no HTTP", async () => {
  const fake = { ...config, provider: "fake" as const, apiKey: undefined };
  const transport = {
    send: async () => {
      throw new Error("must not call");
    },
  };
  assert.equal(
    (await sendMail(fake, message, { transport })).state,
    "rejected",
  );
  assert.deepEqual(
    await sendMail(fake, message, { allowFake: true, transport }),
    {
      state: "accepted",
      providerMessageId: "synthetic-tenant1:notice1",
      synthetic: true,
    },
  );
});
test("unexpected transport exceptions become unknown with no raw error", async () => {
  assert.deepEqual(
    await sendMail(config, message, {
      transport: {
        send: async () => {
          throw new Error("secret key");
        },
      },
    }),
    { state: "unknown", errorCode: "transport_result_unconfirmed" },
  );
});

test("body-read stall is bounded and a missing key never calls HTTP", async () => {
  let calls = 0;
  const transport = createResendTransport({
    timeoutMs: 10,
    fetch: async () => {
      calls++;
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"id":'));
          },
        }),
      );
    },
  });
  assert.equal(
    (await sendMail({ ...config, apiKey: undefined }, message, { transport }))
      .state,
    "rejected",
  );
  assert.equal(calls, 0);
  assert.equal(
    (await sendMail(config, message, { transport })).state,
    "unknown",
  );
  assert.equal(calls, 1);
});
