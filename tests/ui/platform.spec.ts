import { expect, test, type Page } from "@playwright/test";
async function login(page: Page) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD for an isolated test database.",
    );
  await page.goto("/");
  await page.getByLabel("電子郵件").fill(email);
  await page.getByLabel("密碼", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page.getByRole("heading", { name: "對話分析" })).toBeVisible();
}
test("admin edits groups and model settings and persists a streamed conversation", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "群組管理", exact: true }).click();
  const groupName = `Browser group ${Date.now()}`;
  await page.getByLabel("名稱", { exact: true }).fill(groupName);
  await page.getByLabel("說明").fill("Synthetic browser acceptance group");
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: groupName, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `編輯 ${groupName}`, exact: true })
    .click();
  await page.getByLabel("說明").fill(`Updated ${groupName}`);
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("cell", {
      name: `Updated ${groupName}`,
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "模型設定", exact: true }).click();
  const modelName = `Browser fake ${Date.now()}`;
  await page.getByLabel("顯示名稱").fill(modelName);
  await page.getByLabel("模型 ID").fill("fake-model");
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `測試 ${modelName}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `測試 ${modelName}`, exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Model check passed");
  await page
    .getByRole("button", { name: `工具測試 ${modelName}`, exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: modelName }),
  ).toContainText("工具能力：已驗證");
  await page.reload();
  await page.getByRole("button", { name: "模型設定", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: modelName }),
  ).toContainText("工具能力：已驗證");
  await page.getByRole("button", { name: "對話分析", exact: true }).click();
  await page
    .getByLabel("模型", { exact: true })
    .selectOption({ label: modelName });
  const prompt = `Synthetic browser analysis ${Date.now()}`;
  await page.getByLabel("訊息", { exact: true }).fill(prompt);
  await page.getByRole("button", { name: "傳送", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "已完成" }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("log")).toContainText(prompt);
  await page.reload();
  await expect(page.getByRole("heading", { name: "對話分析" })).toBeVisible();
  await page
    .getByRole("complementary", { name: "對話歷史" })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("log")).toContainText(prompt);
  await page.getByRole("button", { name: "登出", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "登入", exact: true }),
  ).toBeVisible();
});
test("interrupted SSE preserves partial output and never reports completion", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/core/chats/*/messages", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: 'data: {"type":"run.started","executionId":"browser-partial"}\n\ndata: {"type":"text.delta","delta":"Partial browser output"}\n\n',
    }),
  );
  await page
    .getByLabel("訊息", { exact: true })
    .fill("Synthetic partial stream");
  await page.getByRole("button", { name: "傳送", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Partial browser output");
  await expect(
    page.getByRole("alert").filter({ hasText: "串流已中斷" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "已完成" }),
  ).toHaveCount(0);
});
test("stopping a pending stream restores the composer", async ({ page }) => {
  await login(page);
  await page.route("**/api/core/chats/*/messages", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route
      .fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: 'data: {"type":"run.completed","status":"completed"}\n\n',
      })
      .catch(() => undefined);
  });
  await page.getByLabel("訊息", { exact: true }).fill("Synthetic cancellation");
  await page.getByRole("button", { name: "傳送", exact: true }).click();
  await page.getByRole("button", { name: "停止", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "已停止" }),
  ).toBeVisible();
  await expect(page.getByLabel("訊息", { exact: true })).toBeEnabled();
  await expect(
    page.getByRole("status").filter({ hasText: "已完成" }),
  ).toHaveCount(0);
});

for (const width of [1440, 390]) {
  test(`workspace is keyboard accessible without page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByLabel("電子郵件")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("電子郵件")).toBeFocused();
    await login(page);
    for (const label of [
      "模型設定",
      "使用者管理",
      "群組管理",
      "個人設定",
      "對話分析",
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: label, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
}

test("ordinary user profile persists and server denies admin and other-user history", async ({
  page,
}) => {
  await login(page);
  const origin = new URL(page.url()).origin;
  const fixture = `browser-${Date.now()}`;
  const email = `${fixture}@example.test`;
  const password = `Synthetic-${fixture}-password`;
  const createdChat = await page.request.post("/api/core/chats", {
    headers: { Origin: origin },
    data: { title: `Private ${fixture}` },
  });
  expect(createdChat.ok()).toBe(true);
  const chatId = (await createdChat.json()).item.id as string;
  await page.getByRole("button", { name: "使用者管理", exact: true }).click();
  await page.getByLabel("名稱", { exact: true }).fill(fixture);
  await page.getByLabel("電子郵件").fill(email);
  await page.getByLabel("初始密碼").fill(password);
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: fixture, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "登出", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "登入", exact: true }),
  ).toBeVisible();
  await page.getByLabel("電子郵件").fill(email);
  await page.getByLabel("密碼", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page.getByRole("heading", { name: "對話分析" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "使用者管理", exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get("/api/core/users")).status()).toBe(403);
  expect((await page.request.get(`/api/core/chats/${chatId}`)).status()).toBe(
    404,
  );
  await page.getByRole("button", { name: "個人設定", exact: true }).click();
  const updatedName = `${fixture} updated`;
  await page.getByLabel("名稱", { exact: true }).fill(updatedName);
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("個人資料已更新");
  await page.reload();
  await page.getByRole("button", { name: "個人設定", exact: true }).click();
  await expect(page.getByLabel("名稱", { exact: true })).toHaveValue(
    updatedName,
  );
  const newPassword = `${password}-changed`;
  await page.getByLabel("目前密碼", { exact: true }).fill(password);
  await page
    .getByLabel("新密碼（不變更請留空）", { exact: true })
    .fill(newPassword);
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("密碼已更新");
  await page.getByLabel("電子郵件").fill(email);
  await page.getByLabel("密碼", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page.getByRole("heading", { name: "對話分析" })).toBeVisible();
});

test("real fake-provider cancellation and failure remain distinct in saved history", async ({
  page,
}) => {
  await login(page);
  const title = `[demo:slow] Browser cancellation ${Date.now()}`;
  await page.getByLabel("訊息", { exact: true }).fill(title);
  const stream = page.waitForResponse(
    (response) =>
      response.url().endsWith("/messages") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "傳送", exact: true }).click();
  expect((await stream).ok()).toBe(true);
  const cancellation = page.waitForRequest((request) =>
    request.url().endsWith("/cancel"),
  );
  await page.getByRole("button", { name: "停止", exact: true }).click();
  const cancelledRequest = await cancellation;
  const chatPath = new URL(cancelledRequest.url()).pathname.replace(
    /\/cancel$/,
    "",
  );
  await expect
    .poll(async () => {
      const result = await page.request.get(chatPath);
      const data = (await result.json()) as {
        item: { messages: { status: string }[] };
      };
      return data.item.messages.some(
        (message) => message.status === "cancelled",
      );
    })
    .toBe(true);
  await page.reload();
  await page
    .getByRole("complementary", { name: "對話歷史" })
    .getByRole("button", { name: title, exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText("cancelled");
  await page.getByRole("button", { name: "新對話", exact: true }).click();
  await page
    .getByLabel("訊息", { exact: true })
    .fill("[demo:error] Browser failure");
  await page.getByRole("button", { name: "傳送", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "執行失敗" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "已完成" }),
  ).toHaveCount(0);
});
