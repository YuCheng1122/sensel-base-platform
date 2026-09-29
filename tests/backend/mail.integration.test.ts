import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  createCoreHandler,
  sendConfiguredMail,
  type CoreConfig,
} from "../../packages/server/src/index";
import { createPrismaStore } from "../../templates/project/web/src/server/prisma-store";
import type { MailMessage } from "@sensel/mail/contracts";
test(
  "mail configuration is encrypted and audited; durable reservation prevents concurrent resend",
  { skip: !process.env.CORE_TEST_DATABASE_URL },
  async () => {
    const url = process.env.CORE_TEST_DATABASE_URL!;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "127.0.0.1");
    assert.ok(parsed.pathname.endsWith("_audit"));
    const db = new PrismaClient({ datasources: { db: { url } } });
    const store = createPrismaStore(db);
    const suffix = randomUUID(),
      password = "synthetic-mail-password",
      passwordHash = await bcrypt.hash(password, 12);
    const actor = await db.user.create({
      data: {
        email: `mail-admin-${suffix}@example.test`,
        name: "Synthetic Mail Admin",
        passwordHash,
        role: "ADMIN",
      },
    });
    const user = await db.user.create({
      data: {
        email: `mail-user-${suffix}@example.test`,
        name: "Synthetic Mail User",
        passwordHash,
        role: "USER",
      },
    });
    let sends = 0;
    const config: CoreConfig = {
      store,
      encryptionKey: randomBytes(32).toString("base64"),
      agentSecret: "synthetic-agent-secret".repeat(2),
      agentUrl: "http://127.0.0.1:1",
      secureCookies: false,
      allowedModelEndpoints: [],
      allowFake: false,
      allowFakeMail: true,
      mailTransport: {
        async send(_config, message) {
          sends++;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return {
            state: "accepted",
            providerMessageId: `mock-${message.idempotencyKey}`,
          };
        },
      },
    };
    let handle = createCoreHandler(config);
    const call = async (
      path: string,
      method = "GET",
      body?: unknown,
      cookie?: string,
    ) => {
      const response = await handle(
        new Request(`http://localhost/api/core/${path}`, {
          method,
          headers: {
            "content-type": "application/json",
            ...(cookie ? { cookie } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
      return {
        status: response.status,
        data: await response.json(),
        cookie: response.headers.get("set-cookie")?.split(";")[0],
      };
    };
    try {
      const cookie = (
        await call("auth/login", "POST", { email: actor.email, password })
      ).cookie!;
      const userCookie = (
        await call("auth/login", "POST", { email: user.email, password })
      ).cookie!;
      for (const path of ["mail/settings", "mail/deliveries"])
        assert.equal(
          (await call(path, "GET", undefined, userCookie)).status,
          403,
        );
      assert.equal(
        (
          await call(
            "mail/test",
            "POST",
            {
              to: "synthetic@example.test",
              expectedVersion: 1,
              idempotencyKey: randomUUID(),
            },
            userCookie,
          )
        ).status,
        403,
      );
      const before = (await call("mail/settings", "GET", undefined, cookie))
        .data.item;
      const input = {
        provider: "resend" as const,
        enabled: true,
        fromName: "SenseL synthetic test",
        fromEmail: "sender@example.test",
        expectedVersion: before.version,
        apiKey: "synthetic-api-key-never-network",
      };
      const saved = await call("mail/settings", "PATCH", input, cookie);
      assert.equal(saved.status, 200);
      assert.equal(saved.data.item.hasApiKey, true);
      assert.equal(saved.data.item.apiKey, undefined);
      assert.equal(saved.data.item.encryptedApiKey, undefined);
      const stored = await db.mailConfiguration.findUniqueOrThrow({
        where: { id: "mail" },
      });
      assert.ok(stored.encryptedApiKey?.startsWith("gcm1:"));
      assert.ok(!stored.encryptedApiKey?.includes(input.apiKey));
      const audit = await db.mailSettingsAudit.findFirstOrThrow({
        where: { actorId: actor.id },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(!JSON.stringify(audit).includes(input.apiKey));
      assert.ok(!JSON.stringify(audit).includes("gcm1:"));
      const { apiKey: _secret, ...blankInput } = input;
      const preserved = await call(
        "mail/settings",
        "PATCH",
        { ...blankInput, apiKey: "", expectedVersion: saved.data.item.version },
        cookie,
      );
      assert.equal(preserved.status, 200);
      assert.equal(
        (
          await db.mailConfiguration.findUniqueOrThrow({
            where: { id: "mail" },
          })
        ).encryptedApiKey,
        stored.encryptedApiKey,
      );
      const concurrentSettings = await Promise.all([
        call(
          "mail/settings",
          "PATCH",
          {
            ...blankInput,
            fromName: "Concurrent A",
            expectedVersion: preserved.data.item.version,
          },
          cookie,
        ),
        call(
          "mail/settings",
          "PATCH",
          {
            ...blankInput,
            fromName: "Concurrent B",
            expectedVersion: preserved.data.item.version,
          },
          cookie,
        ),
      ]);
      assert.deepEqual(
        concurrentSettings.map((result) => result.status).sort(),
        [200, 409],
      );
      const current = await store.mailSettings(actor.id);
      const testInput = {
        to: "receiver@example.test",
        expectedVersion: current.version,
        idempotencyKey: randomUUID(),
      };
      const [first, second] = await Promise.all([
        call("mail/test", "POST", testInput, cookie),
        call("mail/test", "POST", testInput, cookie),
      ]);
      assert.equal(first.status, 200);
      assert.equal(second.status, 200);
      assert.equal(sends, 1);
      assert.equal(first.data.item.id, second.data.item.id);
      assert.ok(
        [first.data.item.state, second.data.item.state].includes("accepted"),
      );
      const replay = await call("mail/test", "POST", testInput, cookie);
      assert.equal(replay.data.replayed, true);
      assert.equal(replay.data.item.state, "accepted");
      assert.equal(sends, 1);
      assert.equal(
        (
          await call(
            "mail/test",
            "POST",
            { ...testInput, to: "different@example.test" },
            cookie,
          )
        ).status,
        409,
      );
      const unknownInput = { ...testInput, idempotencyKey: randomUUID() };
      let uncertainSends = 0;
      handle = createCoreHandler({
        ...config,
        mailTransport: {
          async send() {
            uncertainSends++;
            return { state: "unknown", errorCode: "mock_timeout" };
          },
        },
      });
      assert.equal(
        (await call("mail/test", "POST", unknownInput, cookie)).data.item.state,
        "unknown",
      );
      assert.equal(
        (await call("mail/test", "POST", unknownInput, cookie)).data.item.state,
        "unknown",
      );
      assert.equal(uncertainSends, 1);
      handle = createCoreHandler(config);
      const generic: MailMessage = {
        to: ["generic@example.test"],
        subject: "Generic synthetic message",
        text: "No real email is sent",
        expectedVersion: current.version,
        idempotencyKey: randomUUID(),
      };
      const interruptedStore = {
        ...store,
        async mailSettings() {
          throw new Error("simulated process interruption");
        },
        async completeMail() {
          throw new Error("simulated receipt persistence interruption");
        },
      };
      const interrupted = await sendConfiguredMail(
        { ...config, store: interruptedStore },
        actor.id,
        generic,
      );
      assert.equal(interrupted.item.state, "unknown");
      const restored = await sendConfiguredMail(config, actor.id, generic);
      assert.equal(restored.replayed, true);
      assert.equal(restored.item.errorCode, "IN_PROGRESS_OR_INTERRUPTED");
      assert.equal(sends, 1);
      const newDb = new PrismaClient({ datasources: { db: { url } } });
      try {
        const durable = await sendConfiguredMail(
          { ...config, store: createPrismaStore(newDb) },
          actor.id,
          generic,
        );
        assert.equal(durable.replayed, true);
        assert.equal(durable.item.state, "unknown");
        assert.equal(sends, 1);
      } finally {
        await newDb.$disconnect();
      }
      const changeBeforeDispatch = {
        ...store,
        async mailSettings(id: string) {
          await store.saveMailSettings(id, {
            provider: current.provider,
            enabled: false,
            fromName: current.fromName,
            fromEmail: current.fromEmail,
            expectedVersion: current.version,
          });
          return store.mailSettings(id);
        },
      };
      const stale = await sendConfiguredMail(
        { ...config, store: changeBeforeDispatch },
        actor.id,
        { ...generic, idempotencyKey: randomUUID() },
      );
      assert.equal(stale.item.state, "cancelled");
      assert.equal(sends, 1);
      const disabled = await store.mailSettings(actor.id);
      const disabledResult = await sendConfiguredMail(config, actor.id, {
        ...generic,
        expectedVersion: disabled.version,
        idempotencyKey: randomUUID(),
      });
      assert.equal(disabledResult.item.state, "cancelled");
      assert.equal(sends, 1);
      const fakeConfig = await store.saveMailSettings(actor.id, {
        provider: "fake",
        enabled: true,
        fromName: "Synthetic",
        fromEmail: "synthetic@example.test",
        expectedVersion: disabled.version,
      });
      await db.mailConfiguration.update({
        where: { id: "mail" },
        data: { encryptedApiKey: "synthetic-unreadable-key-not-used-by-fake" },
      });
      const fake = await sendConfiguredMail(config, actor.id, {
        ...generic,
        expectedVersion: fakeConfig.version,
        idempotencyKey: randomUUID(),
      });
      assert.equal(fake.item.state, "accepted");
      assert.equal(fake.item.synthetic, true);
      assert.equal(sends, 1);
      const noFake = await sendConfiguredMail(
        { ...config, allowFake: true, allowFakeMail: false },
        actor.id,
        {
          ...generic,
          expectedVersion: fakeConfig.version,
          idempotencyKey: randomUUID(),
        },
      );
      assert.equal(noFake.item.state, "rejected");
      assert.equal(sends, 1);
      const revokedStore = {
        ...store,
        async mailSettings(id: string) {
          await db.user.update({ where: { id }, data: { enabled: false } });
          return store.mailSettings(id);
        },
      };
      const revoked = await sendConfiguredMail(
        { ...config, store: revokedStore },
        actor.id,
        {
          ...generic,
          expectedVersion: fakeConfig.version,
          idempotencyKey: randomUUID(),
        },
      );
      assert.equal(revoked.item.state, "cancelled");
      assert.equal(revoked.item.errorCode, "AUTHORIZATION_CHANGED");
      await db.user.update({
        where: { id: actor.id },
        data: { enabled: true },
      });
      const deliveries = await call(
        "mail/deliveries?page=1&pageSize=2",
        "GET",
        undefined,
        cookie,
      );
      assert.equal(deliveries.status, 200);
      assert.equal(deliveries.data.items.length, 2);
      assert.ok(deliveries.data.total >= 7);
      assert.equal(
        JSON.stringify(deliveries.data).includes(input.apiKey),
        false,
      );
      assert.equal(
        (await call("mail/deliveries?pageSize=101", "GET", undefined, cookie))
          .status,
        400,
      );
    } finally {
      await db.$disconnect();
    }
  },
);
