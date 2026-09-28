# 客戶分析專案

由SenseL Base Platform初始化。`web/`是Next.js組合層及Prisma儲存；`agent/`是Python工具／prompt組合層。平台共用功能從npm套件及Python wheel安裝，不從原平台路徑import。

在web/執行npm install、npm run db:generate。複製web/.env.example，設定獨立PostgreSQL及秘密；載入必要環境後執行db:migrate、db:bootstrap、dev。另在Python venv安裝對應sensel-agent-core wheel，執行`uvicorn main:app --app-dir agent --port 8001`。

PUBLIC_APP_URL應等於瀏覽器origin，AGENT_URL與BACKEND_URL互指服務，AGENT_SHARED_SECRET兩端一致。正式關閉fake，啟用Secure cookie／HTTPS。Nginx或PCAP schema、查詢、頁面與工具自行加在本repo；Elasticsearch不是必要服務。

客戶需補充自己的業務需求、工具清單、資料保存及部署方式。不要保留真實資料在Git。

平台的Dockerfile使用平台workspace作build context，不會直接複製到這個repo；客戶需建立自己的容器與部署設定。

共用功能包含事件概覽、報告下載（固定快照、PDF／CSV／JSON）、平台設定與變更紀錄。五個npm套件為 `@sensel/ui`、`@sensel/chat`、`@sensel/analytics`、`@sensel/reports`、`@sensel/server`。保留SenseL品牌與原導覽，也可配置客戶名稱及圖片。

`web/src/server/synthetic-analysis-provider.ts` 是明確的示範資料，正式接案時以自己的 `AnalysisProvider` 替換，在 `web/src/server/core.ts` 注入。依使用者id／role／groupIds限制來源與查詢，資料時間使用UTC瞬間；分類使用穩定ID，未知統計用null。Nginx可只查自己Prisma表；PCAP解析及檔案保存另由專案處理。

報告建立只查詢一次，保存完整快照，之後預覽與匯出不重新查詢來源。新提供者必須描述完整／部分／抽樣覆蓋，不可把清單前50筆當成全量。`public/fonts/`包含中文PDF字型與OFL授權，部署時一起保留。舊報告的時區及內容不跟著平台預設變更。
