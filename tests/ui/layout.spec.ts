import { expect, test, type Page } from "@playwright/test";

async function navigate(page: Page, label: string) {
  if (label === "個人設定") {
    const menu = page.getByRole("button", { name: "使用者選單", exact: true });
    if (!(await menu.isVisible()))
      await page
        .getByRole("button", { name: "切換側邊欄", exact: true })
        .click();
    await menu.click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
    return;
  }
  const link = page.getByRole("button", { name: label, exact: true });
  if (!(await link.isVisible())) {
    if ((page.viewportSize()?.width ?? 1920) < 768)
      await page
        .getByRole("button", { name: "切換側邊欄", exact: true })
        .click();
    if (!(await link.isVisible()))
      await page.getByRole("button", { name: "系統設定", exact: true }).click();
  }
  await link.click();
}
for (const width of [1920, 390]) {
  test(`analysis reports and all settings share content geometry at ${width}px`, async ({
    page,
  }, testInfo) => {
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
      throw new Error("Synthetic admin credentials required");
    await page.setViewportSize({ width, height: 1080 });
    await page.goto("/");
    await page.getByLabel("電子郵件").fill(process.env.ADMIN_EMAIL);
    await page
      .getByLabel("密碼", { exact: true })
      .fill(process.env.ADMIN_PASSWORD);
    await page.getByLabel("密碼", { exact: true }).press("Enter");
    await expect(
      page.getByRole("heading", { name: "對話分析", exact: true }),
    ).toBeVisible();
    for (const label of [
      "事件概覽",
      "報告下載",
      "平台設定",
      "信件服務",
      "模型設定",
      "使用者管理",
      "群組管理",
      "個人設定",
    ]) {
      await navigate(page, label);
      const content = page.locator("main .sensel-page");
      await expect(content.locator("h1")).toBeVisible();
      const geometry = await content.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const parent = element.closest("main")!.getBoundingClientRect();
        const css = getComputedStyle(element);
        return {
          width: bounds.width,
          left: bounds.left,
          parentWidth: parent.width,
          parentLeft: parent.left,
          padding: parseFloat(css.paddingLeft),
          title: getComputedStyle(element.querySelector("h1")!).fontSize,
          sectionSizes: [...element.querySelectorAll("h2")].map(
            (heading) => getComputedStyle(heading).fontSize,
          ),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(geometry.width, label).toBeCloseTo(
        Math.min(geometry.parentWidth, 1280),
        0,
      );
      expect(geometry.left - geometry.parentLeft, label).toBeCloseTo(
        (geometry.parentWidth - geometry.width) / 2,
        0,
      );
      expect(geometry.padding, label).toBe(width < 640 ? 16 : 24);
      expect(geometry.title, label).toBe(width < 640 ? "20px" : "24px");
      expect(
        geometry.sectionSizes.every((size) => size === "16px"),
        label,
      ).toBe(true);
      expect(geometry.overflow, label).toBe(false);
      if (["事件概覽", "平台設定", "報告下載"].includes(label))
        await page.screenshot({ path: testInfo.outputPath(`${label}-${width}.png`) });
    }
    await navigate(page, "事件概覽");
    const trigger = page.getByRole("button", { name: /^時間範圍：/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const picker = page.locator(".overview-range-popover");
    await expect(picker).toBeVisible();
    const bounds = await picker.boundingBox();
    expect(bounds!.width).toBeCloseTo(Math.min(512, width - 32), 0);
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 15);
    const input = picker.getByLabel("起始時間（UTC）");
    expect((await input.boundingBox())!.height).toBe(36);
    await page.screenshot({ path: testInfo.outputPath(`range-${width}.png`) });
    await input.fill("2026-09-29T12:00");
    await picker.getByLabel("結束時間（UTC）").fill("2026-09-28T12:00");
    await picker.getByRole("button", { name: "套用時間" }).click();
    await expect(picker.getByRole("alert")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await navigate(page, "對話分析");
    await expect(page.locator(".sensel-chat")).toBeVisible();
    await expect(page.locator("main .sensel-page")).toHaveCount(0);
  });
}
