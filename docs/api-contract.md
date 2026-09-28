# API 契約

Web template掛載 `/api/core/[...path]`，使用HttpOnly session cookie。mutation核對PUBLIC_APP_URL／Origin，跨來源請求拒絕。錯誤回傳 `{error:{code,message}}`，不把內部例外或秘密暴露到UI。

| 路徑（/api/core下） | 方法 | 功能 |
| --- | --- | --- |
| auth/login、auth/logout | POST | 建立／撤銷session |
| auth/me | GET、PATCH | 目前使用者、資料／密碼變更 |
| users、groups | GET、POST、PATCH | 管理員操作，變更使用expectedVersion |
| models | GET、POST、PATCH | 一般用戶讀啟用模型；管理員保存設定 |
| models/:id/test | POST | mode=connection或tools，保存當前版本檢查結果 |
| chats | GET、POST | 自己的對話清單／建立 |
| chats/:id | GET、DELETE | 自己的對話內容／刪除 |
| chats/:id/messages | POST | content及可選modelId，回傳SSE |
| chats/:id/cancel | POST | executionId取消，驗證執行ownership |

`/api/health`僅驗證Web儲存就緒，不等待Agent或模型。`/api/agent/tools/project-info`為範本工具端點，不屬通用資料API。

Agent使用Bearer服務驗證及execution-bound profile；Web→Agent採NDJSON，Web→browser採SSE。欄位與事件定義以 [runtime-v1](../contracts/runtime-v1.md) 為準；不複製另一套定義。

此平台v1不是Digiwin原 `/api/agent/v1` 的相容升級。客戶接入時必須採新契約或自行保留相容adapter。

## 事件概覽、報告與平台設定

| Endpoint（`/api/core`下） | 行為 |
| --- | --- |
| GET `/overview/sources` | 目前使用者可讀來源 |
| GET `/overview?from=…&to=…&sourceId=…` | 含完整性標示的通用聚合，最多90天 |
| GET／POST `/reports` | 目前使用者報告清單（query/page/pageSize）／採集並保存快照 |
| GET／DELETE `/reports/:id` | 讀取／刪除目前使用者保存的快照 |
| GET／PATCH `/settings` | 安全共用設定／管理員攜expectedVersion更新 |
| GET `/settings/audit?cursor=…` | 管理員讀取每頁50筆平台設定變更 |

分析與報告契約分別以 `@sensel/analytics/contracts`、`@sensel/reports/contracts` 為準。日期為UTC瞬間、開始包含／結束不包含；報告保存IANA顯示時區。來源缺失／離線回503而非假空資料；已保存報告讀取不依賴來源在線。所有寫入沿用登入、same-origin檢查，報告擁有權由伺服器處理。詳見 [客戶接入](analytics-and-reports.md)。
