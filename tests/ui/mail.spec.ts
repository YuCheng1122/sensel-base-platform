import { expect, test, type Page } from "@playwright/test";

async function openMail(page: Page) {
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
  const link = page.getByRole("button", { name: "信件服務", exact: true });
  if (!(await link.isVisible())) {
    if ((page.viewportSize()?.width ?? 1440) < 768)
      await page
        .getByRole("button", { name: "切換側邊欄", exact: true })
        .click();
    if (!(await link.isVisible()))
      await page.getByRole("button", { name: "系統設定", exact: true }).click();
  }
  await link.click();
  await expect(
    page.getByRole("heading", { name: "共用寄件服務", exact: false }),
  ).toBeVisible();
}
const settings = {
  provider: "fake",
  fromName: "Synthetic mail",
  fromEmail: "sender@example.test",
  enabled: true,
  version: 4,
  hasApiKey: true,
  allowedProviders: ["resend", "fake"],
};
function receipt(key: string, state: "accepted" | "unknown") {
  return {
    id: "synthetic-ui-receipt",
    idempotencyKey: key,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    actorId: "synthetic",
    to: ["recipient@example.test"],
    subject: "Synthetic test",
    configVersion: 4,
    state,
    providerMessageId: state === "accepted" ? "synthetic-message" : null,
    errorCode: state === "unknown" ? "IN_PROGRESS_OR_INTERRUPTED" : null,
    synthetic: true,
  };
}
test("mail form retains blank key, masks configuration and reports version conflict", async ({
  page,
}) => {
  let writes = 0;
  await page.route("**/api/core/mail/settings", async (route) => {
    if (route.request().method() === "PATCH") {
      writes++;
      const data = route.request().postDataJSON();
      expect(data.apiKey).toBeUndefined();
      expect(data.expectedVersion).toBe(4);
      await route.fulfill({
        status: 409,
        json: {
          error: { code: "CONFLICT", message: "設定版本已變更，請重新載入。" },
        },
      });
    } else
      await route.fulfill({
        json: {
          item: {
            ...settings,
            provider: "resend",
            allowedProviders: ["resend"],
          },
        },
      });
  });
  await page.route("**/api/core/mail/deliveries?*", (route) =>
    route.fulfill({ json: { items: [], total: 0, page: 1, pageSize: 10 } }),
  );
  await openMail(page);
  await expect(page.getByLabel("寄信供應商").locator("option")).toHaveCount(1);
  await expect(page.getByText("••••••••（已設定，不顯示內容）")).toBeVisible();
  await page.getByLabel("寄件者名稱").fill("Changed synthetic name");
  await page
    .getByRole("button", { name: "保存寄信服務設定", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "設定版本已變更" }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await expect(
    page.getByRole("button", { name: "寄送測試信", exact: true }),
  ).toBeDisabled();
});

test("lost mail response retains the operation over reload and never automatically resends", async ({
  page,
}) => {
  let key = "";
  let sends = 0;
  await page.route("**/api/core/mail/settings", (route) =>
    route.fulfill({ json: { item: settings } }),
  );
  await page.route("**/api/core/mail/deliveries?*", (route) =>
    route.fulfill({
      json: {
        items: key ? [receipt(key, "unknown")] : [],
        total: key ? 1 : 0,
        page: 1,
        pageSize: 10,
      },
    }),
  );
  await page.route("**/api/core/mail/test", async (route) => {
    sends++;
    key = route.request().postDataJSON().idempotencyKey;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.abort("failed");
  });
  await openMail(page);
  await page.getByLabel("測試收件者").fill("recipient@example.test");
  await page.getByRole("button", { name: "寄送測試信", exact: true }).click();
  await page
    .getByRole("button", { name: "確認寄送測試信", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "寄送測試信", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("寄送結果未知，可能已寄出").first(),
  ).toBeVisible();
  expect(sends).toBe(1);
  await expect(page.getByLabel("測試收件者")).toBeDisabled();
  await page.reload();
  const link = page.getByRole("button", { name: "信件服務", exact: true });
  if (!(await link.isVisible()))
    await page.getByRole("button", { name: "系統設定", exact: true }).click();
  await link.click();
  await expect(page.getByLabel("測試收件者")).toHaveValue(
    "recipient@example.test",
  );
  await expect(page.getByLabel("測試收件者")).toBeDisabled();
  await expect(page.getByText(key, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "寄送測試信", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "重新整理投遞紀錄", exact: true })
    .click();
  expect(sends).toBe(1);
  await page
    .getByRole("button", { name: "開始另一筆測試", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("可能造成重複郵件");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect(sends).toBe(1);
});

for (const width of [1440, 390]) {
  test(`mail accepted receipt is honest and responsive at ${width}px`, async ({
    page,
  }, testInfo) => {
    let key = "";
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/core/mail/settings", (route) =>
      route.fulfill({ json: { item: settings } }),
    );
    await page.route("**/api/core/mail/deliveries?*", (route) =>
      route.fulfill({
        json: {
          items: key ? [receipt(key, "accepted")] : [],
          total: key ? 1 : 0,
          page: 1,
          pageSize: 10,
        },
      }),
    );
    await page.route("**/api/core/mail/test", (route) => {
      key = route.request().postDataJSON().idempotencyKey;
      return route.fulfill({
        json: { item: receipt(key, "accepted"), replayed: false },
      });
    });
    await openMail(page);
    await page.getByLabel("測試收件者").fill("recipient@example.test");
    await page.getByRole("button", { name: "寄送測試信", exact: true }).click();
    await page
      .getByRole("button", { name: "確認寄送測試信", exact: true })
      .click();
    await expect(
      page.getByText("供應商已接受，尚未確認送達").first(),
    ).toBeVisible();
    await expect(
      page.getByText("合成測試，未寄出真實郵件").first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`mail-${width}.png`),
      fullPage: true,
    });
  });
}
