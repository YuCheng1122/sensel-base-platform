import { expect, test, type Page } from "@playwright/test";

async function openUserMenu(page: Page) {
  const trigger = page.getByRole("button", { name: "使用者選單", exact: true });
  if (!(await trigger.isVisible()))
    await page.getByRole("button", { name: "切換側邊欄", exact: true }).click();
  await trigger.click();
}
async function navigate(page: Page, label: string) {
  if (label === "個人設定") {
    await openUserMenu(page);
    await page.getByRole("menuitem", { name: label, exact: true }).click();
    return;
  }
  const target = page.getByRole("button", { name: label, exact: true });
  if (!(await target.isVisible())) {
    const menuToggle = page.getByRole("button", { name: "切換側邊欄", exact: true });
    if ((page.viewportSize()?.width ?? 1440) < 768) await menuToggle.click();
    if (!(await target.isVisible()))
      await page.getByRole("button", { name: "系統設定", exact: true }).click();
  }
  await target.click();
}
async function logout(page: Page) {
  await openUserMenu(page);
  await page.getByRole("menuitem", { name: "登出", exact: true }).click();
}

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
  await page.getByLabel("密碼", { exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: "對話分析" })).toBeVisible();
}
test("admin edits groups and model settings and persists a streamed conversation", async ({
  page,
}) => {
  await login(page);
  await navigate(page, "群組管理");
  const groupName = `Browser group ${Date.now()}`;
  await page.getByRole("button", { name: "新增群組", exact: true }).click();
  await page.getByRole("dialog").getByLabel("名稱", { exact: true }).fill(groupName);
  await page.getByRole("dialog").getByLabel("說明").fill("Synthetic browser acceptance group");
  await page.getByRole("dialog").getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: groupName, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `編輯 ${groupName}`, exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("說明").fill(`Updated ${groupName}`);
  await page.getByRole("dialog").getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("cell", {
      name: `Updated ${groupName}`,
      exact: true,
    }),
  ).toBeVisible();
  await navigate(page, "模型設定");
  const modelName = `Browser fake ${Date.now()}`;
  await page.getByLabel("顯示名稱").fill(modelName);
  await page.getByRole("combobox", { name: "提供者", exact: true }).selectOption("fake");
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
    page.getByRole("region", { name: "模型詳情", exact: true }),
  ).toContainText("工具能力：已驗證");
  await page.reload();
  await navigate(page, "模型設定");
  await page.getByRole("button", { name: modelName, exact: true }).click();
  await expect(
    page.getByRole("region", { name: "模型詳情", exact: true }),
  ).toContainText("工具能力：已驗證");
  await navigate(page, "對話分析");
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
  await page.getByRole("button", { name: "開啟工具執行紀錄", exact: true }).click();
  const tools = page.getByRole("complementary", { name: "對話工具紀錄", exact: true });
  await expect(tools).toBeVisible();
  await tools.locator("summary").filter({ hasText: "project_info" }).click();
  await expect(tools).toContainText("completed");
  await page.getByRole("button", { name: "收合工具紀錄", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "對話分析" })).toBeVisible();
  await page
    .getByRole("complementary", { name: "對話歷史" })
    .getByRole("button", { name: prompt, exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(prompt);
  await logout(page);
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
    await page.getByLabel("電子郵件").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("密碼", { exact: true })).toBeFocused();
    await login(page);
    for (const label of [
      "模型設定",
      "使用者管理",
      "群組管理",
      "個人設定",
      "對話分析",
    ]) {
      await navigate(page, label);
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
  await navigate(page, "使用者管理");
  await page.getByRole("button", { name: "新增使用者", exact: true }).click();
  const createUser = page.getByRole("dialog");
  await createUser.getByLabel("名稱", { exact: true }).fill(fixture);
  await createUser.getByLabel("電子郵件").fill(email);
  await createUser.getByLabel("初始密碼").fill(password);
  await createUser.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: fixture, exact: true }),
  ).toBeVisible();
  await logout(page);
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
  await navigate(page, "個人設定");
  const updatedName = `${fixture} updated`;
  await page.getByLabel("名稱", { exact: true }).fill(updatedName);
  await page.getByRole("button", { name: "儲存", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("個人資料已更新");
  await page.reload();
  await navigate(page, "個人設定");
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
  const modelResponse = await page.request.post("/api/core/models", {
    headers: { Origin: new URL(page.url()).origin },
    data: { name: `Cancellation fixture ${Date.now()}`, provider: "fake", model: "fake-model", enabled: true, isDefault: false, timeoutSeconds: 60, maxOutputTokens: 2048 },
  });
  expect(modelResponse.ok()).toBe(true);
  const modelId = (await modelResponse.json()).item.id as string;
  await page.reload();
  await page.getByRole("combobox", { name: "模型", exact: true }).selectOption(modelId);
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
  await expect(page.getByRole("log")).toContainText(/cancelled|已取消|已停止/);
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

for (const width of [1440, 390]) {
  test(`source login layout and keyboard validation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "登入您的帳號", exact: true })).toBeVisible();
    const formPanel = page.locator(".auth-form-panel");
    const brandPanel = page.locator(".auth-brand-panel");
    await expect(formPanel).toBeVisible();
    await expect(page.getByRole("img", { name: "Avocado SenseL", exact: true }).first()).toBeVisible();
    if (width >= 768) {
      await expect(brandPanel).toBeVisible();
      const formBounds = await formPanel.boundingBox();
      const brandBounds = await brandPanel.boundingBox();
      expect(formBounds!.width / width).toBeCloseTo(0.45, 2);
      expect(brandBounds!.width / width).toBeCloseTo(0.55, 2);
    } else {
      await expect(brandPanel).toBeHidden();
      expect((await formPanel.boundingBox())!.width).toBe(width);
    }
    const email = page.getByLabel("電子郵件");
    const password = page.getByLabel("密碼", { exact: true });
    const inputStyle = await email.evaluate(node => ({ radius: parseFloat(getComputedStyle(node).borderRadius), height: node.getBoundingClientRect().height }));
    expect(inputStyle.radius).toBeGreaterThanOrEqual(inputStyle.height / 2);
    await email.focus();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
    await email.fill(`invalid-browser-${width}@example.test`);
    await password.fill("synthetic-wrong-password");
    await password.press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "INVALID_CREDENTIALS" })).toBeVisible();
    await expect(page.getByRole("button", { name: "登入", exact: true })).toBeEnabled();
    await expect(page.getByRole("heading", { name: "登入您的帳號", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test("unknown tool outcome remains visibly incomplete in the restored trace panel", async ({ page }) => {
  await login(page);
  await page.route("**/api/core/chats/*/messages", route => route.fulfill({
    status: 200,
    contentType: "text/event-stream",
    body: [
      { type: "run.started", executionId: "browser-unknown" },
      { type: "tool.started", toolCallId: "tool-1", toolName: "sample_write", status: "running" },
      { type: "tool.completed", toolCallId: "tool-1", toolName: "sample_write", status: "unknown" },
      { type: "run.completed", status: "partial" },
    ].map(event => `data: ${JSON.stringify(event)}\n\n`).join(""),
  }));
  await page.getByLabel("訊息", { exact: true }).fill("Synthetic ambiguous tool outcome");
  await page.getByRole("button", { name: "傳送", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "部分完成" })).toBeVisible();
  await page.getByRole("button", { name: "開啟工具執行紀錄", exact: true }).click();
  const tools = page.getByRole("complementary", { name: "對話工具紀錄", exact: true });
  await tools.locator("summary").filter({ hasText: "sample_write" }).click();
  await expect(tools).toContainText("unknown");
  await expect(tools.getByLabel("工具未成功完成", { exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "已完成" })).toHaveCount(0);
});


test("incomplete user-group loading disables account mutation", async ({ page }) => {
  await login(page);
  await page.route("**/api/core/groups", route => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "SYNTHETIC_GROUP_FAILURE", message: "Synthetic group lookup failed" } }),
  }));
  await navigate(page, "使用者管理");
  await expect(page.getByRole("alert").filter({ hasText: "Synthetic group lookup failed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增使用者", exact: true })).toBeDisabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("初始密碼")).toHaveCount(0);
});
