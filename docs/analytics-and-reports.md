# 共用事件概覽、報告下載與設定

SenseL 的導覽保留「事件概覽」「報告下載」，供不同客戶專案沿用。共用的是呈現、查詢契約、快照儲存與匯出機制；客戶提供實際資料。平台不要求 Elasticsearch，也不內含 Nginx／PCAP 分析器。

## 套件及檔案責任

| 位置 | 責任 |
| --- | --- |
| `packages/analytics/src/contracts.ts` | 來源、時間範圍、指標、趨勢、分類、事件與完整性契約 |
| `packages/analytics/src/event-overview.tsx` | 事件概覽、合法來源選擇、載入／錯誤／空資料與刷新 |
| `packages/analytics/src/overview-dashboard.tsx` | 共用指標卡、趨勢圖、分類圖與事件表格；可呈現報告快照 |
| `packages/reports/src/contracts.ts` | 不可變報告快照及列表／建立／讀取／刪除介面 |
| `packages/reports/src/reports-center.tsx` | 報告下載頁、建立表單、搜尋、分頁、預覽 |
| `packages/reports/src/snapshot-pdf.tsx` | 中文 PDF、向量摘要圖、明細與頁首頁尾 |
| `packages/reports/src/report-exports.ts` | CSV／JSON 與下載檔名；CSV 防止儲存格公式執行 |
| `packages/ui/src/platform-settings.tsx` | 平台名稱、時區、報告標題及預設查詢天數 |
| `packages/ui/src/settings-audit.tsx` | 最近50筆平台設定變更；API另支援游標分頁 |
| `packages/server/src/feature-handler.ts` | 登入／權限下的概覽、報告、設定 API |
| `templates/project/web/src/server/prisma-feature-store.ts` | 客戶擁有的 PostgreSQL 持久層與設定交易 |
| `templates/project/web/src/server/synthetic-analysis-provider.ts` | 明確標示的合成示範資料；客戶接案時替換此提供者 |
| `templates/project/web/src/app/feature-adapters.ts` | 範本 UI 的 HTTP 組合層 |

原版型與互動層級依來源程式抽離，沒有保留 SOC 專用欄位或假設。兩個套件的 README 與 extraction-manifest.json 記錄來源與差異。

## 客戶如何接入

在客戶的 `web/src/server/` 實作 `AnalysisProvider`，透過 `coreConfig.analysisProvider` 注入。提供者收到的 actor 僅有 `id`、`role`、`groupIds`；必須用這些身分條件限制可讀資料，不能把 UI 隱藏選單當授權。

- `sources(actor)` 回傳這位使用者可讀的來源 ID／名稱。`all` 不是強制來源，UI 不自行擴大來源範圍。
- `collect({actor, query})` 依 ISO 時間 `from <= time < to` 和指定來源取資料，回傳 `OverviewData`。後端驗證來源、範圍、數值、類別 ID、筆數及內容大小。
- Nginx 專案可在自己的 Prisma schema 放請求資料，提供狀態分類、請求趨勢等聚合；PCAP 專案可提供解析結果／協定聚合，解析器、檔案與長任務仍由客戶專案擁有。
- `events[].category` 對應 `categories[].id`，顯示文字放 `label`。未知值用 `null`，不可用0假裝已確認沒有資料。
- `coverage` 區分完整聚合、部分、抽樣；回傳事件清單可比總數少。清單搜尋／分類只篩選已回傳事件，不代表後端全量搜尋。

參考可運行的合成提供者及 [Analytics 套件](../packages/analytics/README.md)。合成資料只有服務啟動日前14個UTC日，不是客戶真實事件，畫面、快照與PDF皆標示。

## 報告保證與限制

建立報告只採集一次，將查詢條件、資料來源、完整性、顯示時區和完整快照保存至 PostgreSQL。之後讀取、預覽、JSON／CSV／PDF 都使用保存內容，不重新查詢資料來源。更新資料需建立另一份快照。來源離線或無法載入平台預設時，既有報告仍可瀏覽與下載，僅停止建立新報告。

每次下載先重新檢查目前登入及報告擁有權。管理員不自動擁有其他使用者報告。PDF採本機Noto中文字型，連同OFL授權分發；長文與跨頁保留完整已保存明細，分類摘要圖最多顯示8項且另有完整分類表。CSV明確為快照內容，不是原始資料全量匯出。

查詢最多90天，回傳事件最多1000筆、快照資料最多5MiB；提供者須自行限制查詢成本，並正確描述截斷／抽樣。此版本採同步、受限大小的報告，不是背景排程或大型批次匯出工作引擎。

目前平台沒有 SOC 報告修訂／敘事編輯、報告自動寄送、排程訂閱、舊資料遷移或 PCAP 解析服務。共用 [郵件runtime](mail-service.md) 可供客戶報告流程接入；不會在建立快照時自動寄送，也未內建SMTP、附件或訂閱queue。

## 設定與部署

一般登入者可讀安全的共用設定，只有管理員可寫入。儲存攜帶 `expectedVersion`；資料庫交易內保存新版本與 before／after 稽核。並行同版本寫入只允許一次成功，其餘回409。這一頁只顯示平台設定稽核，沒有假裝包含帳號／模型所有操作。

新增 migration `202609280002_feature_modules` 只新增平台設定、設定變更及報告快照資料表。升級既有實例先備份，再以同版本migration映像執行 `npm run db:migrate`，最後更換Web映像；不使用 reset／重新bootstrap 覆寫帳號。既有Agent不須為這批功能更新。

新客戶專案需安裝6個相容版本的npm套件，載入 `@sensel/ui/styles.css`、`@sensel/chat/styles.css`、`@sensel/analytics/styles.css`、`@sensel/reports/styles.css`，並保留 `public/fonts/` 的字型及授權；產生器已包含這些步驟。
