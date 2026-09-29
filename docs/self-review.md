# 自己檢查 SenseL Base

[文件首頁](README.md) · [專案首頁](../README.md)

這份指南把畫面驗收、程式閱讀與自動檢查分開。先確認共用底座符合需求，再看測試證據；綠色測試不代表已完成客戶的 Nginx／PCAP 分析。

## 1. 先看畫面（約 15–20 分鐘）

目前本機預覽在 http://localhost:3300，使用你現有的管理員帳號。不要把自動化測試指向這個保留資料的預覽環境。以下涉及保存的操作，請用明確標示的測試資料。

| 入口 | 自己操作 | 應看到的結果 |
| --- | --- | --- |
| 登入／個人設定 | 登入、重新整理、查看個人資料、登出 | 登入狀態正確；錯誤有說明，密碼不回顯 |
| 使用者／群組 | 查看角色、群組；需要修改時使用測試帳號 | 管理功能與一般帳號分開；一般帳號無管理入口 |
| 模型設定 | 查看已保存模型、金鑰狀態與測試狀態 | 金鑰遮蔽；保存設定不代表模型已測試成功；合成模型明確標示 |
| 對話 | 用合成模型開始一筆測試、停止回覆、重新開啟歷史 | 中止／失敗與完成可區分，工具結果可展開，歷史仍在 |
| 事件概覽 | 更換來源、時間範圍 | 指標、圖表及表格一致；合成／不完整資料有標記，不冒充客戶資料 |
| 報告下載 | 打開既有示範報告，下載 PDF／CSV／JSON | PDF 中文可讀；下載內容對應保存快照，並非每次查詢重建 |
| 平台設定 | 查看名稱、時區、報告預設與變更紀錄 | 顯示目前保存版本；修改後重新整理仍一致 |
| 系統設定 → 信件服務 | 查看寄件設定、版本、投遞紀錄 | 金鑰不回顯；預設停用；供應商接受不表示已送達 |
| 手機版 | 瀏覽器裝置工具設寬度 390px，再看登入、側欄、概覽、報告與信件 | 表單可操作、按鈕不被擋住；表格在自己的區塊內捲動 |

若預覽環境沒有可用的合成模型，對話只檢視既有歷史；合成執行移到下方隔離測試環境，不必為驗收呼叫真模型。

信件要試寄時只選「合成測試（不寄信）」；需同時開啟非正式環境及 MAIL_ALLOW_FAKE。若選單沒有這個選項，可只檢視，不必填入真金鑰。Resend 是實際寄信，不屬於無副作用驗收。

## 2. 看文件和目錄（約 10 分鐘）

依序讀 [README](../README.md) → [架構](architecture.md) → [搬移清冊](extraction-inventory.md) → [新專案指南](create-project.md)。清冊會說明哪些已搬、哪些仍屬於客戶專案。Coding Agent 的入口是 [AGENTS.md](../AGENTS.md)。

| 位置 | 重點 |
| --- | --- |
| `packages/ui`、`chat` | 通用畫面、對話與互動；不是客戶資料查詢 |
| `packages/analytics`、`reports` | 通用圖表／快照契約；來源資料由客戶注入 |
| `packages/mail` | 郵件契約和 transport；不內建客戶告警規則 |
| `packages/server` | 認證、授權、設定、對話、報告與寄件流程；透過 CoreStore 存取資料 |
| `python/src/sensel_agent` | 可安裝的 Agent runtime、provider 與工具執行 |
| `templates/project` | 客戶組合層、Prisma schema／adapter、路由和工具入口 |
| `.github/workflows`、`deploy` | CI、版本發布和部署配置；不會自動部署到客戶主機 |

判斷是否足夠通用：新增 Nginx 或 PCAP 時，應主要增加客戶資料表、AnalysisProvider、工具及頁面，不必把客戶邏輯塞進共用套件。Prisma 留在客戶 adapter，Elasticsearch 不是啟動需求。這是不同客戶使用獨立專案的底座，並不等於已提供單一部署的多租戶隔離。

## 3. 本機自動檢查

從 repo 根目錄，使用 Node >=20.19、Python >=3.12。不要在正在服務的同一份 `.next` 上同時 build 與驗收；正式 build 可使用獨立 checkout 或生成的客戶專案。

```sh
npm ci
npm run db:generate
npm run check
npm run dead-code
npm run docs:check
npm audit
uv sync --project python --frozen
uv run --project python ruff check python/src python/tests
uv run --project python pytest python/tests
```

`check` 包含 lint、型別與核心邊界／模組長度。`dead-code` 檢查未使用程式及相依；`docs:check` 檢查本地連結與 Markdown 區塊，不會自動證明說明內容正確。`audit` 是執行當時的相依公告結果，並不保證沒有所有風險。

`npm test` 未設定 CORE_TEST_DATABASE_URL 時會略過資料庫整合，看到 skip 不能當成完整通過。完整後端／瀏覽器驗收必須另開可丟棄的 PostgreSQL、Web 和 Agent，流程見 [測試指南](testing.md) 及 [.github/workflows/ci.yml](../.github/workflows/ci.yml)：

1. 隔離 DB 名稱以 `_audit` 結尾，DATABASE_URL 與 CORE_TEST_DATABASE_URL 指向同一個隔離 DB。
2. 設定合成金鑰／管理員及專用埠；Web／Agent 啟用 APP_ENV=test、AGENT_ALLOW_FAKE=true；Web 額外啟用 MAIL_ALLOW_FAKE=true。
3. migrate → `npm test` → build → bootstrap → 啟動 Web／Agent → `npm run test:ui`。
4. 檢查零失敗與零意外略過，完成後只清除這組隔離環境。不要使用預覽或客戶資料庫。

要驗證「真的能建立另一個專案」，按照 [新專案指南](create-project.md) 打包六個 tgz，生成到 repo 外的新空目錄，再安裝、產生 Prisma client、typecheck 和 build。CI 另外檢查沒有連回 workspace 的套件、版本一致及保留 dependency overrides。

## 4. 在 GitHub 看 CI/CD

開啟 repository 的 Actions → **Platform CI**，確認執行對應你要驗收的 commit，而不是較舊的綠色結果。

- `verify`：安裝、型別／lint／文件／冗餘檢查、真 DB 測試、Python 測試、獨立套件與 wheel、瀏覽器測試應全部通過。
- `containers`：三個映像建置，以及乾淨資料庫的 migration／bootstrap／health／登入檢查應通過。
- 失敗時先看第一個失敗 step；下載 `platform-test-results` 和 `platform-service-logs`。後者包含已啟動的測試 Web／Agent 紀錄；服務尚未啟動時可能沒有此附件。Playwright trace 可用 `npx playwright show-trace /path/to/trace.zip` 開啟。
- `platform-packages` 內應包含六個 npm tgz，以及 Python wheel／source distribution。

**Platform release** 只在發布 GitHub Release 時執行；不要拿發布動作當作測試按鈕。它會先檢查版本並執行完整 CI，成功後才發布 GHCR 映像與 Release 套件附件；不會自動部署客戶主機。版本標籤、套件與內部相依須一致，部署使用工作摘要中的 image digest。詳見 [CI/CD](ci-cd.md)。

本機通過、workflow 檔案存在，不等於 GitHub 已執行成功。遠端結果必須以 Actions 實際 run 為準。

## 5. 如何記錄問題

一筆問題附上：頁面／功能、操作步驟、預期結果、實際結果、畫面寬度與 commit。畫面問題可截圖，API 問題可附狀態碼；不要附密碼、API key、Cookie 或客戶原始資料。

這輪檢查的修正、測試數字及未驗證界線記在 [驗證紀錄](verification.md)。模型供應商實際行為、真實郵件送達、正式 HTTPS／備份還原和 Nginx／PCAP 接入，仍需各自的環境驗收。
