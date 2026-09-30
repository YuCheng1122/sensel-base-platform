import {test,expect,type Page} from "@playwright/test";
import {execFileSync} from "node:child_process";
async function login(page:Page,path="/chat") {await page.goto(path);await page.getByLabel("電子郵件").fill(process.env.ADMIN_EMAIL!);await page.getByLabel("密碼",{exact:true}).fill(process.env.ADMIN_PASSWORD!);await page.getByRole("button",{name:"登入",exact:true}).click();await expect(page.locator(".app-shell")).toBeVisible();}
for(const width of [1440,1920,390])test(`routed overview and full event/entity drill-down at ${width}`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});await login(page,"/overview");
 await expect(page.getByRole("heading",{name:"事件概覽",exact:true})).toBeVisible();
 const hosts=page.getByRole("region",{name:"主機排行",exact:true});await expect(hosts.locator("tbody tr")).toHaveCount(7);
 await expect(page.getByRole("region",{name:"網域排行",exact:true}).locator("tbody tr")).toHaveCount(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:info.outputPath(`overview-${width}.png`),fullPage:true});
 await hosts.getByRole("link").first().click();await expect(page).toHaveURL(/\/entities\/host\//);await expect(page.getByRole("heading",{name:"實體詳情",exact:true})).toBeVisible();await expect(page.getByText("作業系統",{exact:true})).toBeVisible();
 const events=page.getByRole("region",{name:"相關事件",exact:true});await expect(events.locator("tbody tr")).toHaveCount(10);
 await events.getByRole("button",{name:"下一頁",exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(events).toContainText("第 2");await page.reload();await expect(events).toContainText("第 2");
 await page.screenshot({path:info.outputPath(`entity-${width}.png`),fullPage:true});
 await events.getByRole("link").first().click();await expect(page).toHaveURL(/\/events\/synthetic-/);await expect(page.getByLabel("原始資料",{exact:true})).toContainText('"synthetic": true');
 await page.screenshot({path:info.outputPath(`event-${width}.png`),fullPage:true});await page.goBack();await expect(page.getByRole("region",{name:"相關事件",exact:true})).toContainText("第 2");
});
test("draft preview, editable chapter order, save and PDF preserve the same report",async({page},info)=>{
 test.setTimeout(120000);await page.setViewportSize({width:1440,height:1000});await login(page,"/reports");
 await page.getByLabel("報告標題",{exact:true}).fill(`章節圖文驗證 ${Date.now()}`);await page.getByLabel("章節 1 標題").fill("自訂分析摘要");await page.getByLabel("章節 1 內容").fill("第一段：共 {{totalEvents}} 筆。\n\n第二段：保留修改文字。");
 await page.getByRole("button",{name:"新增文字章節",exact:true}).click();await page.getByLabel("章節 7 標題").fill("驗證補充章節");await page.getByLabel("章節 7 內容").fill(Array.from({length:18},(_,i)=>`第 ${i+1} 段合成觀察：這是中文長篇報告的跨頁檢查。`).join("\n\n"));await page.getByRole("button",{name:"上移章節 7",exact:true}).click();
 await page.getByRole("region",{name:"章節 5",exact:true}).getByLabel("包含此章節").uncheck();
 const before=await page.request.get("/api/core/reports");const count=(await before.json()).total;
 await page.getByRole("button",{name:"預覽圖文報告",exact:true}).click();const draft=page.getByRole("region",{name:"報告草稿預覽",exact:true});await expect(draft).toContainText("第二段：保留修改文字。");expect((await(await page.request.get("/api/core/reports")).json()).total).toBe(count);
 await page.screenshot({path:info.outputPath("reports-editor.png"),fullPage:true});
 await page.getByRole("button",{name:"生成並保存新快照",exact:true}).click();const preview=page.getByRole("region",{name:"報告快照預覽",exact:true});await expect(preview).toContainText("自訂分析摘要");await expect(preview.getByRole("heading",{name:/事件樣本/})).toHaveCount(0);
 const download=page.waitForEvent("download");await preview.getByRole("button",{name:"下載 PDF",exact:true}).click();const file=info.outputPath("chapters.pdf");await(await download).saveAs(file);const text=execFileSync("pdftotext",["-layout",file,"-"],{encoding:"utf8"});for(const phrase of ["自訂分析摘要","保留修改文字","驗證補充章節","第 18 段"])expect(text).toContain(phrase);expect(text).not.toContain("{{totalEvents}}");
 execFileSync("pdftoppm",["-f","2","-l","2","-scale-to","1200","-png",file,info.outputPath("report-pdf")]);
 await preview.screenshot({path:info.outputPath("report-preview.png")});await page.getByRole("button",{name:"編輯篩選與內容，另存新報告",exact:true}).click();await expect(page.getByLabel("章節 1 標題")).toHaveValue("自訂分析摘要");
 await page.setViewportSize({width:390,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath("reports-mobile.png"),fullPage:true});
});
test("quota states and per-answer tool histories stay initially collapsed",async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});await login(page,"/chat");
 const created=await page.request.post("/api/core/models",{data:{name:`Synthetic usage and chat ${Date.now()}`,provider:"fake",model:"synthetic",baseUrl:"",timeoutSeconds:30,maxOutputTokens:1000,enabled:true,isDefault:false}});expect(created.ok()).toBe(true);const model=(await created.json()).item;
 for(const mode of ["connection","tools"])expect((await page.request.post(`/api/core/models/${model.id}/test`,{data:{mode}})).ok()).toBe(true);
 await page.goto("/settings/models");await page.getByRole("button",{name:model.name,exact:true}).click();await expect(page.getByRole("region",{name:"模型用量與額度"})).toContainText("尚未提供");
 await page.route(`**/api/core/models/${model.id}/usage`,route=>route.fulfill({json:{item:{status:"available",provider:"合成額度服務",scope:"key",unit:"合成額度",used:25,remaining:75,limit:100,unlimited:false,expiresAt:null,checkedAt:"2026-09-30T00:00:00Z"}}}));
 await page.getByRole("button",{name:"更新用量",exact:true}).click();await expect(page.getByRole("region",{name:"模型用量與額度"})).toContainText("75");await page.getByRole("region",{name:"模型詳情",exact:true}).screenshot({path:info.outputPath("model-usage.png")});
 await page.goto("/chat");await page.getByLabel("模型",{exact:true}).selectOption(model.id);
 await expect(page.getByRole("complementary",{name:"對話工具紀錄",exact:true})).toHaveCount(0);
 await page.getByLabel("訊息",{exact:true}).fill("請查看合成專案資訊");await page.getByRole("button",{name:"傳送",exact:true}).click();await expect(page.getByRole("status").filter({hasText:"已完成"})).toBeVisible({timeout:30000});
 await expect(page.getByRole("complementary",{name:"對話工具紀錄",exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath("chat-collapsed.png"),fullPage:true});await page.getByRole("button",{name:"查看此回覆的工具執行紀錄",exact:true}).click();await expect(page.getByRole("complementary",{name:"對話工具紀錄",exact:true})).toBeVisible();await page.screenshot({path:info.outputPath("chat-tools.png"),fullPage:true});
});
