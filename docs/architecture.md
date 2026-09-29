# 架構與責任

```text
客戶 browser
  → Next.js routes（客戶組合層）
    → @sensel/server → CoreStore → 客戶 Prisma adapter → PostgreSQL
    → Python Agent HTTP API → model provider
      → 客戶註冊的工具 → 受授權的後端 API → 客戶資料儲存
```

`@sensel/ui` 提供管理元件，`@sensel/chat` 提供對話元件，`@sensel/analytics` 提供事件概覽與圖表，`@sensel/reports` 提供快照預覽與匯出。`@sensel/mail` 提供server-only寄件runtime與transport，`@sensel/server`串接加密設定及持久防重。資料由客戶注入 `AnalysisProvider`；server僅引用analytics／reports的純契約入口，不載入瀏覽器繪圖或PDF。套件暴露 TypeScript 原始碼，Next.js 使用 transpilePackages；不是把整個 Next.js app 發成 library。

平台不 import 客戶模組、客戶 generated Prisma client 或 `@/` alias。專案範本負責 routes、Prisma adapter、導覽、工具與部署組合。HTTP／NDJSON 契約跨越 Web／Agent 服務邊界。

Prisma／PostgreSQL 是範本預設。Nginx 分析可新增自己的資料表與查詢服務；Digiwin 若採用平台，可保留自己的 ES 索引。PCAP 檔案、解析器及長任務另由專案實作；本版未提供 durable job engine。

`project_info` 是最小示範工具：Agent 呼叫後端，後端核對簽署 profile、execution、工具授權及目前使用者狀態，回傳非敏感能力摘要與該使用者的對話數量。它不是模擬 Nginx 業務資料。

## 操作限制

當前設計採單一 Web 及單一 Agent instance。取消 registry、登入節流在 process memory；多副本前須另做協調。跨服務 model profile 最長五分鐘，有明確執行 ID；不在全域環境變數替換每次請求的 provider。

舊 Digiwin API、schema 與 prompt 沒有自動遷移。首次採用是明確的功能整合，不可直接把舊資料庫指向新服務。
