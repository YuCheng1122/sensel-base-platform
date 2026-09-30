import {test,expect} from "@playwright/test";
test("capture current shared platform screens using synthetic data",async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});await page.goto("/chat");
 await expect(page.getByRole("button",{name:"登入",exact:true})).toBeVisible();await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));});
 await page.screenshot({path:info.outputPath("login.png"),animations:"disabled"});
 await page.getByLabel("電子郵件").fill(process.env.ADMIN_EMAIL!);await page.getByLabel("密碼",{exact:true}).fill(process.env.ADMIN_PASSWORD!);await page.getByRole("button",{name:"登入",exact:true}).click();await expect(page.getByRole("heading",{name:"對話分析",exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath("chat.png"),animations:"disabled"});
 await page.goto("/overview");const hosts=page.getByRole("region",{name:"主機排行",exact:true});await expect(hosts.locator("tbody tr")).toHaveCount(7);await page.screenshot({path:info.outputPath("overview.png"),animations:"disabled"});await hosts.screenshot({path:info.outputPath("rankings.png"),animations:"disabled"});
 await page.evaluate(()=>document.documentElement.classList.add("dark"));await hosts.screenshot({path:info.outputPath("rankings-dark.png"),animations:"disabled"});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>document.documentElement.classList.remove("dark"));
 await hosts.getByRole("link").first().click();await expect(page.getByText("作業系統",{exact:true})).toBeVisible();await expect(page.getByRole("region",{name:"相關事件",exact:true}).locator("tbody tr")).toHaveCount(10);await page.screenshot({path:info.outputPath("entity.png"),animations:"disabled"});
 await page.getByRole("region",{name:"相關事件",exact:true}).getByRole("link").first().click();await expect(page.getByLabel("原始資料",{exact:true})).toBeVisible();await page.screenshot({path:info.outputPath("event.png"),animations:"disabled"});
 await page.goto("/reports");await expect(page.getByLabel("章節 1 內容")).toBeVisible();await page.screenshot({path:info.outputPath("reports.png"),animations:"disabled"});
 await page.route("**/api/core/models",route=>route.fulfill({json:{items:[{id:"synthetic-quota",name:"合成示範模型",provider:"fake",model:"synthetic",baseUrl:"",timeoutSeconds:60,maxOutputTokens:2048,hasApiKey:false,enabled:true,isDefault:false,version:1,testedVersion:1,toolsTestedVersion:1,toolsSupported:true}]}}));
 await page.route("**/api/core/models/synthetic-quota/usage",route=>route.fulfill({json:{item:{status:"available",provider:"合成額度服務",scope:"key",unit:"合成額度",used:25,remaining:75,limit:100,unlimited:false,expiresAt:null,checkedAt:"2026-09-30T00:00:00Z"}}}));
 await page.goto("/settings/models");const model=page.getByRole("region",{name:"模型詳情",exact:true});await expect(model).toContainText("同一金鑰共用");await model.screenshot({path:info.outputPath("model-usage.png"),animations:"disabled"});
});
