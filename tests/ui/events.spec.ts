import { expect, test } from "@playwright/test";
for (const width of [1440, 390]) {
  test(`returned event filters sorting and distribution stay scoped at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/api/core/overview/sources", (route) =>
      route.fulfill({
        json: { items: [{ id: "fixture", label: "合成事件" }] },
      }),
    );
    await page.route("**/api/core/overview?*", (route) => {
      const url = new URL(route.request().url());
      const query = {
        from: url.searchParams.get("from")!,
        to: url.searchParams.get("to")!,
        sourceId: "fixture",
      };
      return route.fulfill({
        json: {
          item: {
            version: 1,
            query,
            generatedAt: query.to,
            dataset: { kind: "synthetic", label: "合成排序案例" },
            metrics: [{ id: "count", label: "事件總數", value: 100 }],
            trend: [{ time: query.from, value: 100 }],
            categories: [
              { id: "a", label: "Alpha", value: 60 },
              { id: "b", label: "Beta", value: 40 },
            ],
            events: Array.from({ length: 31 }, (_, index) => ({
              id: `row-${String(index + 1).padStart(2, "0")}`,
              title: `Event ${String(index + 1).padStart(2, "0")}`,
              time: new Date(
                Date.parse(query.from) + index * 60000,
              ).toISOString(),
              category: index % 2 === 0 ? "a" : "b",
              ...(index % 3 === 0
                ? { level: "warning" }
                : index % 3 === 1
                  ? { level: "info" }
                  : {}),
            })),
            coverage: { status: "complete", totalEvents: 100 },
          },
        },
      });
    });
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
    if (width < 768)
      await page
        .getByRole("button", { name: "切換側邊欄", exact: true })
        .click();
    await page.getByRole("button", { name: "事件概覽", exact: true }).click();
    const region = page.getByRole("region", { name: "事件列表", exact: true });
    const firstRow = region.locator("tbody tr").first();
    await expect(firstRow).toContainText("Event 31");
    const aggregate = page.getByRole("region", {
      name: "事件分佈",
      exact: true,
    });
    const recentLevels = page.getByRole("region", {
      name: "最近事件等級",
      exact: true,
    });
    await expect(recentLevels).toContainText("僅回傳清單 31 筆");
    const categoryBounds = await aggregate.boundingBox();
    const levelBounds = await recentLevels.boundingBox();
    expect(categoryBounds).not.toBeNull();
    expect(levelBounds).not.toBeNull();
    if (width >= 1024) {
      expect(levelBounds!.y).toBeCloseTo(categoryBounds!.y, 0);
      expect(levelBounds!.x).toBeGreaterThan(categoryBounds!.x);
    } else {
      expect(levelBounds!.x).toBeCloseTo(categoryBounds!.x, 0);
      expect(levelBounds!.y).toBeGreaterThan(categoryBounds!.y);
    }

    await expect(region.locator('th[aria-sort="descending"]')).toContainText(
      "事件時間",
    );
    const timeHeader = region.getByRole("button", { name: /依事件時間/ });
    await timeHeader.click();
    await expect(firstRow).toContainText("Event 01");
    await region
      .getByRole("button", { name: "下一頁事件", exact: true })
      .click();
    await expect(firstRow).toContainText("Event 16");
    await region.getByLabel("清單分類", { exact: true }).selectOption("a");
    await expect(firstRow).toContainText("Event 01");
    await expect(region).toContainText("回傳清單內符合 16 筆");
    await region
      .getByLabel("清單等級", { exact: true })
      .selectOption("level:warning");
    await expect(region).toContainText("回傳清單內符合 6 筆");
    await region.getByLabel("搜尋回傳事件").fill("Event 13");
    await expect(region.locator("tbody tr")).toHaveCount(1);
    await expect(firstRow).toContainText("Event 13");
    await region.getByLabel("搜尋回傳事件").fill("");
    await page
      .getByRole("button", { name: "在回傳清單查看 Beta", exact: true })
      .click();
    await expect(region.getByLabel("清單分類", { exact: true })).toHaveValue(
      "b",
    );
    await expect(region.getByLabel("清單等級", { exact: true })).toHaveValue(
      "level:warning",
    );
    await expect(region).toContainText("回傳清單內符合 5 筆");
    await expect(recentLevels).toContainText("僅回傳清單 31 筆");

    const titleSort = region.getByRole("button", {
      name: "依事件排序",
      exact: true,
    });
    await titleSort.focus();
    await page.keyboard.press("Enter");
    await expect(region.locator('th[aria-sort="ascending"]')).toHaveText(
      "事件",
    );
    await expect(
      page.getByRole("region", { name: "資料範圍與完整性" }),
    ).toContainText("100");
    await expect(page.locator(".overview-metric-value").first()).toContainText(
      "100",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`events-${width}.png`),
      fullPage: true,
    });
  });
}
