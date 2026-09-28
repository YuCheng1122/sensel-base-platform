import assert from "node:assert/strict";
import test from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  createCoreHandler,
  type CoreConfig,
  type PlatformSettings,
} from "../../packages/server/src/index";
import { createPrismaStore } from "../../templates/project/web/src/server/prisma-store";
import { createSyntheticAnalysisProvider } from "../../templates/project/web/src/server/synthetic-analysis-provider";
const range = {
  from: "2026-09-27T00:00:00.000Z",
  to: "2026-09-28T00:00:00.000Z",
};
test("synthetic overview applies source and half-open UTC range filters", async () => {
  const provider = createSyntheticAnalysisProvider(new Date(range.to));
  const actor = {
    id: "synthetic",
    email: "synthetic@example.test",
    name: "Synthetic",
    role: "USER" as const,
    passwordHash: "unused",
    enabled: true,
    version: 1,
    groupIds: [],
  };
  const all = await provider.collect({
    actor,
    query: { ...range, sourceId: "all" },
  });
  const source = await provider.collect({
    actor,
    query: { ...range, sourceId: "sample-a" },
  });
  assert.equal(all.coverage.totalEvents, 24);
  assert.equal(source.coverage.totalEvents, 12);
  assert.ok(
    all.events.every((event) =>
      all.categories.some((category) => category.id === event.category),
    ),
  );
  assert.equal(
    all.trend.reduce((sum, point) => sum + (point.value ?? 0), 0),
    24,
  );
  assert.ok(
    all.events.every((row) => row.time >= range.from && row.time < range.to),
  );
  const empty = await provider.collect({
    actor,
    query: {
      from: "2020-01-01T00:00:00.000Z",
      to: "2020-01-02T00:00:00.000Z",
      sourceId: "all",
    },
  });
  assert.equal(empty.coverage.totalEvents, 0);
  assert.equal(empty.coverage.status, "complete");
  assert.equal(
    empty.metrics.find((metric) => metric.id === "error-rate")?.value,
    null,
  );
});
test(
  "reports remain immutable and owner scoped; settings are versioned and audited",
  { skip: !process.env.CORE_TEST_DATABASE_URL },
  async () => {
    const url = process.env.CORE_TEST_DATABASE_URL!;
    const parsed = new URL(url);
    assert.equal(parsed.hostname, "127.0.0.1");
    assert.ok(parsed.pathname.endsWith("_audit"));
    const db = new PrismaClient({ datasources: { db: { url } } });
    const store = createPrismaStore(db);
    const id = randomUUID(),
      password = "synthetic-feature-password",
      passwordHash = await bcrypt.hash(password, 12);
    const admin = await db.user.create({
      data: {
        email: `features-admin-${id}@example.test`,
        name: "Synthetic",
        passwordHash,
        role: "ADMIN",
      },
    });
    const member = await db.user.create({
      data: {
        email: `features-member-${id}@example.test`,
        name: "Synthetic",
        passwordHash,
        role: "USER",
      },
    });
    let collections = 0;
    const synthetic = createSyntheticAnalysisProvider(new Date(range.to));
    const config: CoreConfig = {
      store,
      encryptionKey: randomBytes(32).toString("base64"),
      agentSecret: "synthetic-feature-secret".repeat(2),
      agentUrl: "http://127.0.0.1:1",
      secureCookies: false,
      allowedModelEndpoints: [],
      allowFake: true,
      analysisProvider: {
        async sources(actor) {
          assert.deepEqual(Object.keys(actor).sort(), [
            "groupIds",
            "id",
            "role",
          ]);
          return synthetic.sources(actor);
        },
        async collect(input) {
          assert.deepEqual(Object.keys(input.actor).sort(), [
            "groupIds",
            "id",
            "role",
          ]);
          collections++;
          return synthetic.collect(input);
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
    let restoreSettings: PlatformSettings | undefined;
    let finalSettingsVersion: number | undefined;
    try {
      const adminCookie = (
        await call("auth/login", "POST", { email: admin.email, password })
      ).cookie!;
      const userCookie = (
        await call("auth/login", "POST", { email: member.email, password })
      ).cookie!;
      const sources = await call(
        "overview/sources",
        "GET",
        undefined,
        userCookie,
      );
      assert.equal(sources.data.items.length, 3);
      const query = new URLSearchParams({ ...range, sourceId: "sample-a" });
      const overview = await call(
        `overview?${query}`,
        "GET",
        undefined,
        userCookie,
      );
      assert.equal(overview.data.item.coverage.totalEvents, 12);
      assert.equal(
        (
          await call(
            "overview?from=2026-01-01T00:00:00Z&to=2026-09-28T00:00:00Z",
            "GET",
            undefined,
            userCookie,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            `overview?${new URLSearchParams({ ...range, sourceId: "missing" })}`,
            "GET",
            undefined,
            userCookie,
          )
        ).status,
        404,
      );
      const initial = await call("settings", "GET", undefined, userCookie);
      restoreSettings = initial.data.item;
      const input = {
        name: "Synthetic workspace",
        timezone: "Asia/Taipei",
        reportTitle: "Synthetic report",
        defaultRangeDays: 14,
        expectedVersion: initial.data.item.version,
      };
      assert.equal(
        (await call("settings", "PATCH", input, userCookie)).status,
        403,
      );
      assert.equal(
        (
          await call(
            "settings",
            "PATCH",
            { ...input, timezone: "Invalid/Nowhere" },
            adminCookie,
          )
        ).status,
        400,
      );
      const updated = await call("settings", "PATCH", input, adminCookie);
      assert.equal(updated.status, 200);
      assert.equal(updated.data.item.version, input.expectedVersion + 1);
      assert.equal(
        (await call("settings", "PATCH", input, adminCookie)).status,
        409,
      );
      const audit = await call("settings/audit", "GET", undefined, adminCookie);
      assert.equal(audit.data.items[0].before.version, input.expectedVersion);
      assert.equal(audit.data.items[0].after.name, input.name);
      assert.equal(
        (await call("settings/audit", "GET", undefined, userCookie)).status,
        403,
      );
      const contenders = await Promise.all([
        call(
          "settings",
          "PATCH",
          {
            ...input,
            name: "Concurrent A",
            expectedVersion: updated.data.item.version,
          },
          adminCookie,
        ),
        call(
          "settings",
          "PATCH",
          {
            ...input,
            name: "Concurrent B",
            expectedVersion: updated.data.item.version,
          },
          adminCookie,
        ),
      ]);
      assert.deepEqual(
        contenders.map((result) => result.status).sort(),
        [200, 409],
      );
      const finalSettings = await store.settings();
      finalSettingsVersion = finalSettings.version;
      assert.equal(finalSettings.version, updated.data.item.version + 1);

      const beforeCollect = collections;
      const created = await call(
        "reports",
        "POST",
        { title: `Snapshot ${id}`, range, sourceId: "sample-a" },
        userCookie,
      );
      assert.equal(created.status, 201);
      assert.equal(collections, beforeCollect + 1);
      const snapshot = created.data.item;
      assert.equal(snapshot.timeZone, "Asia/Taipei");
      assert.equal(snapshot.data.coverage.totalEvents, 12);
      assert.equal(
        (await call(`reports/${snapshot.id}`, "GET", undefined, adminCookie))
          .status,
        404,
      );
      assert.equal(
        (await call(`reports/${snapshot.id}`, "DELETE", undefined, adminCookie))
          .status,
        404,
      );
      const listing = await call(
        `reports?query=${encodeURIComponent(id)}&page=1&pageSize=1`,
        "GET",
        undefined,
        userCookie,
      );
      assert.equal(listing.data.total, 1);
      assert.equal(listing.data.items[0].data, undefined);
      assert.equal(
        (await call("reports?pageSize=101", "GET", undefined, userCookie))
          .status,
        400,
      );
      handle = createCoreHandler({
        ...config,
        analysisProvider: {
          sources: synthetic.sources,
          async collect() {
            throw new Error("synthetic provider unavailable");
          },
        },
      });
      assert.deepEqual(
        (await call(`reports/${snapshot.id}`, "GET", undefined, userCookie))
          .data.item,
        snapshot,
      );
      assert.equal(
        (
          await call(
            "reports",
            "POST",
            { title: "Unavailable", range },
            userCookie,
          )
        ).status,
        503,
      );
      assert.equal(
        (await store.reports(member.id, { query: "", page: 1, pageSize: 20 }))
          .total,
        1,
      );
      handle = createCoreHandler({
        ...config,
        analysisProvider: {
          async sources() {
            throw new Error("unavailable sources");
          },
          collect: synthetic.collect,
        },
      });
      assert.equal(
        (
          await call(
            "reports",
            "POST",
            { title: "Unavailable source", range },
            userCookie,
          )
        ).status,
        503,
      );
      assert.equal(
        (await store.reports(member.id, { query: "", page: 1, pageSize: 20 }))
          .total,
        1,
      );
      handle = createCoreHandler({
        ...config,
        analysisProvider: {
          sources: synthetic.sources,
          async collect(input) {
            const data = await synthetic.collect(input);
            return {
              ...data,
              events: [
                {
                  id: "outside",
                  time: range.to,
                  title: "Invalid provider event",
                  category: data.categories[0]!.id,
                },
              ],
            };
          },
        },
      });
      assert.equal(
        (
          await call(
            "reports",
            "POST",
            { title: "Invalid range", range },
            userCookie,
          )
        ).status,
        503,
      );
      const restarted = new PrismaClient({ datasources: { db: { url } } });
      try {
        assert.deepEqual(
          await createPrismaStore(restarted).report(member.id, snapshot.id),
          snapshot,
        );
      } finally {
        await restarted.$disconnect();
      }
      handle = createCoreHandler({ ...config, analysisProvider: undefined });
      assert.equal(
        (await call(`overview?${query}`, "GET", undefined, userCookie)).status,
        503,
      );
      assert.equal(
        (await call(`reports/${snapshot.id}`, "GET", undefined, userCookie))
          .status,
        200,
      );
      assert.equal(
        (await call(`reports/${snapshot.id}`, "DELETE", undefined, userCookie))
          .status,
        200,
      );
      assert.equal(
        (await call(`reports/${snapshot.id}`, "GET", undefined, userCookie))
          .status,
        404,
      );
    } finally {
      if (restoreSettings && finalSettingsVersion) {
        const current = await store.settings();
        if (current.version === finalSettingsVersion) {
          const { version: _version, ...fields } = restoreSettings;
          await store.saveSettings(admin.id, {
            ...fields,
            expectedVersion: current.version,
          });
        }
      }
      await db.$disconnect();
    }
  },
);
