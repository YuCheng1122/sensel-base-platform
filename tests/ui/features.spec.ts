import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function login(page: Page) {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
    throw new Error("Synthetic admin credentials required");
  await page.goto("/");
  await page.getByLabel("電子郵件").fill(process.env.ADMIN_EMAIL);
  await page
    .getByLabel("密碼", { exact: true })
    .fill(process.env.ADMIN_PASSWORD);
  await page.getByLabel("密碼", { exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "對話分析", exact: true }),
  ).toBeVisible();
}
async function navigate(page: Page, label: string) {
  const target = page.getByRole("button", { name: label, exact: true });
  if (!(await target.isVisible()))
    await page.getByRole("button", { name: "切換側邊欄", exact: true }).click();
  await target.click();
}

test("overview source filters and errors preserve honest data state", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "事件概覽");
  await expect(
    page.getByRole("heading", { name: "事件概覽", exact: true }),
  ).toBeVisible();
  const coverage = page.getByRole("region", { name: "資料範圍與完整性" });
  await expect(coverage).toContainText("合成示範資料");
  const response = page.waitForResponse(
    (response) =>
      response.url().includes("/api/core/overview?") &&
      response.url().includes("sample-a"),
  );
  await page.getByRole("button", { name: "示範來源 A", exact: true }).click();
  const { item } = await (await response).json();
  expect(item.query.sourceId).toBe("sample-a");
  expect(item.coverage.totalEvents).toBeGreaterThan(0);
  const events = page.getByRole("region", { name: "事件列表", exact: true });
  await events.getByLabel("搜尋回傳事件").fill("not-an-existing-event");
  await expect(events).toContainText("沒有");
  await page.route("**/api/core/overview?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "Synthetic provider unavailable",
        },
      }),
    }),
  );
  await page
    .getByRole("button", { name: "重新整理事件概覽", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Synthetic provider unavailable" }),
  ).toBeVisible();
  await expect(coverage).toHaveCount(0);
  await page.unroute("**/api/core/overview?*");
  await page.getByRole("button", { name: "重新載入", exact: true }).click();
  await expect(coverage).toBeVisible();
});

test("saved reports download actual JSON CSV and Chinese PDF and survive settings changes", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await login(page);
  await navigate(page, "報告下載");
  const title = `SenseL 合成報告 ${Date.now()}`;
  await page.getByLabel("報告標題").fill(title);
  await page.getByLabel("報告顯示時區").fill("Asia/Taipei");
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/core/reports") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "生成並保存新快照", exact: true })
    .click();
  const { item: saved } = await (await created).json();
  expect(saved.title).toBe(title);
  const preview = page.getByRole("region", {
    name: "報告快照預覽",
    exact: true,
  });
  await expect(
    preview.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await expect(preview).toContainText("Asia/Taipei");
  for (const format of ["JSON", "CSV", "PDF"]) {
    const downloaded = page.waitForEvent("download", { timeout: 60000 });
    await preview
      .getByRole("button", { name: `下載 ${format}`, exact: true })
      .click();
    const download = await downloaded;
    expect(await download.failure()).toBeNull();
    const file = testInfo.outputPath(`snapshot.${format.toLowerCase()}`);
    await download.saveAs(file);
    const bytes = await readFile(file);
    if (format === "JSON") expect(JSON.parse(bytes.toString())).toEqual(saved);
    if (format === "CSV") {
      expect(bytes.toString()).toContain(title);
      expect(bytes.toString()).toContain("synthetic");
    }
    if (format === "PDF") {
      expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
      expect(bytes.length).toBeGreaterThan(1000);
    }
  }
  const { item: before } = await (
    await page.request.get("/api/core/settings")
  ).json();
  const { version, ...values } = before;
  const update = await page.request.patch("/api/core/settings", {
    data: {
      ...values,
      timezone: before.timezone === "UTC" ? "Asia/Taipei" : "UTC",
      expectedVersion: version,
    },
  });
  expect(update.ok()).toBe(true);
  const { item: after } = await update.json();
  const reread = await (
    await page.request.get(`/api/core/reports/${saved.id}`)
  ).json();
  expect(reread.item).toEqual(saved);
  expect(
    (
      await page.request.patch("/api/core/settings", {
        data: { ...values, expectedVersion: after.version },
      })
    ).ok(),
  ).toBe(true);
  await page.route("**/api/core/overview/sources", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "PROVIDER_UNAVAILABLE",
          message: "Synthetic source offline",
        },
      }),
    }),
  );
  await page.reload();
  await navigate(page, "報告下載");
  await expect(
    page.getByRole("alert").filter({ hasText: "Synthetic source offline" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: `開啟報告：${title}`, exact: true })
    .click();
  await expect(
    preview.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  const offlineDownload = page.waitForEvent("download");
  await preview.getByRole("button", { name: "下載 JSON", exact: true }).click();
  expect(await (await offlineDownload).failure()).toBeNull();
  await page.unroute("**/api/core/overview/sources");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: `刪除報告：${title}`, exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: `開啟報告：${title}`, exact: true }),
  ).toHaveCount(0);
  expect(
    (await page.request.get(`/api/core/reports/${saved.id}`)).status(),
  ).toBe(404);
});

test("platform settings persist with audit and features fit mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await login(page);
  await navigate(page, "平台設定");
  await page.getByLabel("平台名稱").fill("SenseL");
  await page.getByRole("button", { name: "儲存平台設定", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "平台設定已儲存" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "平台設定變更紀錄" }),
  ).toContainText("操作者");
  await page.reload();
  await navigate(page, "平台設定");
  await expect(page.getByLabel("平台名稱")).toHaveValue("SenseL");
  await page.getByLabel("平台名稱").fill("未儲存的修改");
  await page.getByRole("button", { name: "重新載入設定", exact: true }).click();
  await expect(page.getByLabel("平台名稱")).toHaveValue("SenseL");
  for (const name of ["事件概覽", "報告下載", "平台設定"]) {
    await navigate(page, name);
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    if (name === "事件概覽")
      await expect(
        page.getByRole("region", { name: "資料範圍與完整性" }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
