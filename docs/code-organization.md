# 目錄、檔案與命名

```text
packages/
  ui/src/                 共用管理 UI、表單、樣式、API client
  chat/src/               對話、工具紀錄、SSE parser
  analytics/src/          圖表、事件概覽、通用資料契約
  reports/src/            報告快照UI、PDF／CSV／JSON匯出
  mail/src/               郵件契約、Resend transport、受控寄件runtime
  server/src/             CoreStore 契約、auth、model settings、Agent bridge、郵件coordinator
python/
  src/sensel_agent/        FastAPI factory、provider、runtime、profile、tools、trace
  tests/                  Python 合成契約測試
contracts/                版本化跨語言協定
templates/project/
  web/src/app/            Next.js composition 與 HTTP routes
  web/src/server/         真實 Prisma adapter 與 config
  web/prisma/             schema、migration、bootstrap
  agent/main.py           客戶工具註冊及應用入口
scripts/                  打包、生成專案及架構檢查
tests/backend/           Web contract／Prisma／串流測試
tests/ui/                瀏覽器及 parser 測試
deploy/                  Compose 與設定範例
docs/                    架構、操作、決策、驗證文件
```

templates、tests、deploy 皆在 repo 根目錄。沒有 production source 放在 docs 或 scripts 中。

TypeScript 自訂檔案採 kebab-case，React component 用 PascalCase，hooks 用 useXxx。Next.js 保留 page.tsx、layout.tsx、route.ts。Python 模組／函式採 snake_case，類別 PascalCase。測試為 *.test.ts、*.spec.ts、test_*.py。常用文件固定 README.md、AGENTS.md、DESIGN.md。

新增客戶頁面放客戶 `web/src/app/`；HTTP route 只接入與轉換請求，業務流程放客戶 server 模組。新增工具放客戶 `agent/`，註冊到 ToolRegistry，並在 Web 簽署允許名單中啟用。共用能力經確認後才改 packages 或 python core。

新 production module 保持單一責任且不超過400行。不要新增 utils/common 桶、備份實作或為未來用途建立空目錄。相依方向由 `npm run boundaries` 檢查；細節見各套件 README。
