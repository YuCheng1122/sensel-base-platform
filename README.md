# SenseL Base Platform

不同客戶、不同分析用途共用的應用程式與 Agent 底座。此 repo 名稱為 `sensel-base`，遠端為 `AvocadoAI-Lab/sensel-base-platform`；TypeScript 套件使用 `@sensel/*`，Python 套件為 `sensel-agent-core`。

共用的是帳號、群組、UI、模型管理、對話、工具紀錄與執行機制。客戶資料模型、分析工具、提示詞及頁面由各客戶 repo 擁有。Nginx 可只用 Prisma／PostgreSQL；未來 PCAP 可另接檔案儲存及解析工作。平台不需要 Elasticsearch 或 Redis，也不內含 SOC、Nginx 或 PCAP 分析產品。

## 已提供

- 登入／登出、使用者啟停與角色、群組、個人資料和密碼。
- 加密模型設定、連線與工具能力檢查、設定版本與預設模型門檻。
- Chat 歷史、串流、取消、工具輸入輸出、部分結果及失敗狀態。
- Python runtime 支援 OpenAI 相容、Anthropic、Gemini 文字／工具呼叫；合成測試可使用明確啟用的 fake provider。
- 事件概覽與共用指標／趨勢／分類圖表，來源、時間範圍與資料完整性呈現。
- 報告快照保存、預覽、搜尋／分頁與中文PDF／CSV／JSON下載。
- 平台名稱、時區、報告預設與版本化設定變更紀錄。
- 共用 Resend 寄件 runtime、管理員郵件設定／測試與持久投遞紀錄；未知結果不自動重寄。
- 客戶擁有的 Prisma schema／migration 與工具註冊範本。
- 套件打包、獨立專案產生器、測試及 CI/CD／Compose 配置。

這是從 Digiwin 選擇性抽取並調整介面的第一版，不是原專案的整包副本或資料庫直接替代品。尚未搬入通知訂閱／排程、settings operation replay、完整帳號／模型稽核 UI、分散式取消與長任務恢復。詳見 [搬移清冊](docs/extraction-inventory.md) 與 [驗證紀錄](docs/verification.md)。

## 開始使用

需要 Node.js >=20.19、npm、Python >=3.12、uv 與 PostgreSQL 15。從 repo 根目錄：

```sh
npm ci
npm run db:generate
uv sync --project python --frozen
cp templates/project/web/.env.example templates/project/web/.env
```

填入自己的隔離開發資料庫、兩個獨立隨機金鑰與管理員資料；參考 [設定說明](docs/configuration.md)。Prisma CLI 會讀 web/.env；bootstrap 和 Agent 命令需明確載入同一組必要環境變數，詳見 [開發指南](docs/development.md)。

```sh
npm run db:migrate
npm run db:bootstrap
npm run dev
```

另一個終端啟動 Agent：

```sh
uv run --project python uvicorn main:app --app-dir templates/project/agent --port 8001
```

Web 預設 http://localhost:3000，Agent 8001。Web 登入後到模型設定：新增→保存→連線測試→工具測試→設定預設。未設定模型也能操作帳號；Web 健康檢查不需模型在線。

## 建立客戶專案

```sh
npm run pack:core
npm run create:project -- /tmp/my-analysis-project --packages "$PWD/artifacts/packages"
```

生成的是獨立的 `web/`、`agent/` 與文件；不會建立遠端、啟動服務或覆蓋既有目錄。Python wheel 另行安裝。完整步驟見 [新專案指南](docs/create-project.md)。

## 閱讀入口

- 開發者：[文件索引](docs/README.md)、[架構](docs/architecture.md)、[目錄規範](docs/code-organization.md)。
- Coding Agent：[AGENTS.md](AGENTS.md)。產品 Agent：[執行與擴充](docs/agent-runtime.md)。
- 分析與報告：[共用功能與客戶接入](docs/analytics-and-reports.md)。郵件：[寄件服務](docs/mail-service.md)。
- UI：[DESIGN.md](DESIGN.md)。維運：[部署](docs/deployment.md)、[CI/CD](docs/ci-cd.md)。

本地驗證結果記錄於驗證文件；遠端工作流程與正式部署須另行確認。
