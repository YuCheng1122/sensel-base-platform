import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { createPrismaStore } from "../../templates/project/web/src/server/prisma-store";
import {
  createCoreHandler,
  authorizeTool,
  signProfile,
  type CoreConfig,
} from "../../packages/server/src/index";
const enabled = process.env.CORE_TEST_DATABASE_URL !== undefined;
test(
  "Prisma core authenticates, isolates chats, revokes sessions and detects stale settings",
  { skip: !enabled },
  async () => {
    const url = process.env.CORE_TEST_DATABASE_URL!;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "127.0.0.1");
    assert.ok(
      parsed.pathname.endsWith("_audit"),
      "Use a dedicated *_audit synthetic database",
    );
    const db = new PrismaClient({ datasources: { db: { url } } });
    const store = createPrismaStore(db);
    const suffix = randomUUID();
    const password = "synthetic-test-password";
    const root = await db.user.create({
      data: {
        email: `admin-${suffix}@example.test`,
        name: "Synthetic Admin",
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
      },
    });
    const config: CoreConfig = {
      store,
      encryptionKey: randomBytes(32).toString("base64"),
      agentSecret: "test-secret-".repeat(4),
      agentUrl: "http://127.0.0.1:1",
      secureCookies: false,
      allowedModelEndpoints: [],
      allowFake: true,
      tools: ["project_info"],
    };
    const handle = createCoreHandler(config);
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
      return { response, data: await response.json() };
    };
    try {
      let result = await call("auth/login", "POST", {
        email: root.email,
        password,
      });
      assert.equal(result.response.status, 200);
      const cookie = result.response.headers.get("set-cookie")!.split(";")[0]!;
      const publicHandler = createCoreHandler({
        ...config,
        publicOrigin: "http://127.0.0.1:3210",
      });
      const publicRequest = (origin: string) =>
        new Request("http://localhost:3210/api/core/chats", {
          method: "POST",
          headers: {
            cookie,
            origin,
            "content-type": "application/json",
            "x-forwarded-host": "other.test",
          },
          body: JSON.stringify({ title: "Trusted browser origin" }),
        });
      assert.equal(
        (await publicHandler(publicRequest("http://127.0.0.1:3210"))).status,
        200,
      );
      assert.equal(
        (await publicHandler(publicRequest("http://other.test"))).status,
        403,
      );
      assert.equal(
        (await publicHandler(publicRequest("http://localhost:3210"))).status,
        403,
      );
      const invalidOriginHandler = createCoreHandler({
        ...config,
        publicOrigin: "https://example.test/path",
      });
      assert.equal(
        (await invalidOriginHandler(publicRequest("http://127.0.0.1:3210")))
          .status,
        503,
      );

      result = await call(
        "users",
        "POST",
        {
          email: `user-${suffix}@example.test`,
          name: "Synthetic User",
          password,
          role: "USER",
          enabled: true,
          groupIds: [],
        },
        cookie,
      );
      assert.equal(result.response.status, 200);
      const user = result.data.item;
      assert.equal(user.passwordHash, undefined);
      const login = await call("auth/login", "POST", {
        email: user.email,
        password,
      });
      const userCookie = login.response.headers
        .get("set-cookie")!
        .split(";")[0]!;
      assert.equal(
        (await call("users", "GET", undefined, userCookie)).response.status,
        403,
      );
      const chat = (await call("chats", "POST", { title: "Private" }, cookie))
        .data.item;
      assert.equal(
        (await call(`chats/${chat.id}`, "GET", undefined, userCookie)).response
          .status,
        404,
      );
      assert.equal((await call(`chats/${chat.id}`, "PATCH", {title:"renamed by stranger"}, userCookie)).response.status,404);
      assert.equal((await call(`chats/${chat.id}`, "PATCH", {title:"Renamed private"}, cookie)).data.item.title,"Renamed private");
      await call("chats", "POST", {title:"Other user's chat"}, userCookie);
      assert.equal((await call("chats", "DELETE", undefined, userCookie)).data.deleted,1);
      assert.equal((await call(`chats/${chat.id}`, "GET", undefined, cookie)).response.status,200);
      const group = (
        await call(
          "groups",
          "POST",
          { name: `group-${suffix}`, description: "Test" },
          cookie,
        )
      ).data.item;
      assert.equal(
        (
          await call(
            "groups",
            "PATCH",
            {
              ...group,
              expectedVersion: group.version,
              name: `updated-${suffix}`,
            },
            cookie,
          )
        ).response.status,
        200,
      );
      assert.equal(
        (
          await call(
            "groups",
            "PATCH",
            { ...group, expectedVersion: group.version },
            cookie,
          )
        ).response.status,
        409,
      );
      const model = (
        await call(
          "models",
          "POST",
          {
            name: "Fake",
            provider: "fake",
            model: "test",
            apiKey: "synthetic-secret",
            enabled: true,
            isDefault: false,
          },
          cookie,
        )
      ).data.item;
      assert.equal(model.hasApiKey, true);
      assert.equal(model.encryptedApiKey, undefined);
      assert.equal(
        (
          await call(
            "models",
            "PATCH",
            { ...model, isDefault: true, expectedVersion: model.version },
            cookie,
          )
        ).response.status,
        409,
      );
      await store.recordModelTest(model.id, model.version, {
        mode: "connection",
        ok: true,
      });
      await store.recordModelTest(model.id, model.version, {
        mode: "tools",
        ok: true,
      });
      result = await call(
        "models",
        "PATCH",
        { ...model, isDefault: true, expectedVersion: model.version },
        cookie,
      );
      assert.equal(result.response.status, 200);
      assert.equal(result.data.item.testedVersion, result.data.item.version);
      const failedCheck = await call(
        `models/${model.id}/test`,
        "POST",
        { mode: "connection" },
        cookie,
      );
      assert.equal(failedCheck.response.status, 200);
      assert.equal(failedCheck.data.item.ok, false);
      const failedModel = (await store.models()).find(
        (m) => m.id === model.id,
      )!;
      assert.equal(failedModel.testedVersion, null);
      assert.equal(failedModel.isDefault, false);
      assert.equal(
        (
          await call(
            "models",
            "PATCH",
            { ...model, isDefault: true, expectedVersion: failedModel.version },
            cookie,
          )
        ).response.status,
        409,
      );
      await assert.rejects(
        () =>
          store.recordModelTest(model.id, model.version, {
            mode: "connection",
            ok: true,
          }),
        /Model changed/,
      );

      const changed = await call(
        "models",
        "PATCH",
        {
          ...result.data.item,
          model: "changed",
          isDefault: false,
          expectedVersion: result.data.item.version,
        },
        cookie,
      );
      assert.equal(changed.data.item.testedVersion, null);
      assert.equal(changed.data.item.toolsTestedVersion, null);
      const history = await store.createChat(root.id, "Bounded history");
      const timestamp = Date.now();
      await db.chatMessage.createMany({
        data: Array.from({ length: 501 }, (_, index) => ({
          chatId: history.id,
          role: "user",
          content: String(index),
          status: "completed",
          createdAt: new Date(timestamp + index),
        })),
      });
      const recent = await store.chat(root.id, history.id);
      assert.equal(recent?.messages?.length, 500);
      assert.equal(recent?.messages?.[0]?.content, "1");
      assert.equal(recent?.messages?.at(-1)?.content, "500");
      const executionId = randomUUID();
      const profileToken = signProfile(
        {
          v: 1,
          sub: user.id,
          executionId,
          exp: Date.now() / 1000 + 60,
          tools: ["project_info"],
        },
        config.agentSecret,
      );
      const toolRequest = () =>
        new Request("http://localhost/api/agent/tools/project-info", {
          method: "POST",
          headers: { authorization: `Bearer ${config.agentSecret}` },
          body: JSON.stringify({ executionId, profileToken, arguments: {} }),
        });
      assert.equal(
        (await authorizeTool(config, toolRequest(), "project_info")).user.id,
        user.id,
      );
      await assert.rejects(() =>
        authorizeTool(config, toolRequest(), "different_tool"),
      );
      assert.equal(
        (
          await call(
            "users",
            "PATCH",
            { ...user, expectedVersion: user.version, enabled: false },
            cookie,
          )
        ).response.status,
        200,
      );
      assert.equal(
        (await call("auth/me", "GET", undefined, userCookie)).response.status,
        401,
      );
      await assert.rejects(() =>
        authorizeTool(config, toolRequest(), "project_info"),
      );
      assert.equal(
        (
          await handle(
            new Request("http://localhost/api/core/auth/logout", {
              method: "POST",
              headers: { cookie, origin: "http://other.test" },
            }),
          )
        ).status,
        403,
      );
      assert.equal(
        (await call("auth/logout", "POST", {}, cookie)).response.status,
        200,
      );
      assert.equal(
        (await call("auth/me", "GET", undefined, cookie)).response.status,
        401,
      );
    } finally {
      await db.$disconnect();
    }
  },
);
