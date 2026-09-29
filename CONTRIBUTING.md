# Contributing to SenseL

[專案首頁](README.md) · [文件首頁](docs/README.md) · [Coding Agent 指南](AGENTS.md)

這份指南供修改共用底座的開發者使用。若要新增 Nginx／PCAP 等客戶功能，先看 [建立客戶專案](docs/create-project.md)。

## Table of Contents

1. [開始修改前](#開始修改前)
2. [程式與文件規範](#程式與文件規範)
3. [驗證變更](#驗證變更)
4. [提交變更](#提交變更)
5. [回報問題](#回報問題)

## 開始修改前

閱讀 [架構](docs/architecture.md) 和 [目錄規範](docs/code-organization.md)，再依 [本地開發](docs/development.md) 建立隔離環境。Node.js 需 >=20.19，Python 需 >=3.12；依賴使用 repo 的 npm／uv lockfile。

可重用能力放在 `packages/` 或 `python/`，客戶的資料 schema、分析工具、提示詞、頁面與部署放在客戶 repo。共用核心透過契約接入儲存，不 import 客戶的 Prisma client 或 `@/` alias，也不強制依賴 Elasticsearch。

## 程式與文件規範

- 每個 production module 保持單一責任並少於 400 行；避免重複實作、未使用的抽象與大型 utils 集合。
- UI 修改遵循 [DESIGN.md](DESIGN.md)，保留版型與操作層級，確認桌面及手機呈現。
- 新增或修改 API、環境變數、資料表、工具與安裝步驟時，同步更新相應文件。
- 更新 [搬移清冊](docs/extraction-inventory.md) 與 [驗證紀錄](docs/verification.md)，只記錄實際執行過的驗證。
- 使用合成資料、fake provider 與可丟棄資料庫；不提交金鑰、Cookie、環境檔或客戶資料。

## 驗證變更

依變更範圍選擇檢查，完整步驟見 [測試指南](docs/testing.md)：

```sh
npm run check
npm run dead-code
npm run docs:check
```

後端變更需跑 `npm test`；涉及持久層時，必須啟用隔離 PostgreSQL 整合測試，不把 skip 當成通過。UI 變更需對隔離 Web／Agent 跑 `npm run test:ui`；Python 變更跑 Ruff 與 pytest。套件或範本變更需另外驗證 repo 外的獨立安裝與 build。

單純文件排版修改執行 `npm run docs:check`，並人工檢查目錄錨點、圖檔及 GitHub Markdown 呈現即可。連結檢查不會自動證明技術說明正確。

## 提交變更

提交前執行 `git diff --check` 並檢視差異，確認沒有產物或秘密。Pull request 請說明解決的問題、變更後的行為、實際驗證方式與剩餘限制。相依或 migration 變更應附升級影響。

CI 通過後仍需依專案流程 review。版本發布會產生套件附件與 GHCR 映像；不要以發布 Release 代替一般測試。流程見 [CI/CD](docs/ci-cd.md)。

## 回報問題

向維護者提供以下資訊，或在 repository 啟用 Issues 時建立 issue：

- commit／版本、頁面或功能，以及相關執行環境。
- 重現步驟、預期結果與實際結果。
- 已遮蔽敏感資料的截圖、狀態碼或錯誤訊息。

畫面問題附瀏覽器及寬度；CI 問題附執行連結與第一個失敗步驟。不要貼上密碼、API key、Cookie 或客戶原始資料。
