# SenseL Documentation

[專案首頁](../README.md) · [貢獻指南](../CONTRIBUTING.md) · [Coding Agent 指南](../AGENTS.md)

從安裝、使用到客戶擴充與部署，這裡集中各階段的文件入口。

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Guides](#user-guides)
3. [Developer Guides](#developer-guides)
4. [Operations](#operations)
5. [Quality and Project Status](#quality-and-project-status)

## Getting Started

第一次接觸 SenseL，建議依序閱讀：

1. [認識底座](../README.md#about-sensel)：有哪些共用功能，哪些由客戶自行實作。
2. [本地開發](development.md)：安裝依賴、初始化與啟動 Web／Agent。
3. [環境設定](configuration.md)：資料庫、金鑰、服務位址與管理員設定。
4. [自行驗收](self-review.md)：逐頁操作、檢查程式與查看 CI。

要開始另一個客戶專案，直接看 [建立獨立客戶專案](create-project.md)。

## User Guides

| 我要做什麼 | 閱讀文件 |
| --- | --- |
| 確認登入、帳號、模型及對話功能 | [畫面操作與驗收清單](self-review.md) |
| 使用事件概覽與報告下載 | [共用分析與報告](analytics-and-reports.md) |
| 設定寄件服務及查看投遞狀態 | [信件服務](mail-service.md) |
| 理解 Agent、工具與執行狀態 | [Agent runtime](agent-runtime.md) |

## Developer Guides

| 主題 | 文件 |
| --- | --- |
| 共用與客戶責任 | [架構](architecture.md) · [架構決策](decisions/0001-independent-customer-projects.md) |
| 目錄、檔名與程式組織 | [目錄規範](code-organization.md) · [UI 設計規範](../DESIGN.md) |
| 客戶擴充 | [新專案指南](create-project.md) · [圖表與報告接入](analytics-and-reports.md) |
| 資料庫與 HTTP | [資料儲存](data-storage.md) · [API 契約](api-contract.md) |
| Python 與跨服務協定 | [Python 套件](../python/README.md) · [Runtime v1](../contracts/runtime-v1.md) |
| 修改與提交 | [貢獻指南](../CONTRIBUTING.md) · [Coding Agent 指南](../AGENTS.md) |

## Operations

- [部署與回復](deployment.md)：服務組合、HTTPS、備份與回復界線。
- [CI/CD](ci-cd.md)：自動檢查、映像建置、Release 及部署步驟。
- [發布](release.md)：套件版本與發布檢查。
- [升級](upgrading.md)：底座套件、客戶範本與 migration 的更新責任。

## Quality and Project Status

- [測試與驗證](testing.md)：隔離環境、後端、Python、瀏覽器與套件驗收。
- [冗餘程式檢查](dead-code.md)：檢查工具與判讀方式。
- [搬移與清理清冊](extraction-inventory.md)：已搬能力、保留項目與延後項目。
- [驗證紀錄](verification.md)：實際測試結果、修正及尚未驗證的界線。

文件與程式應一起更新；新增共用能力時，也要同步搬移清冊、測試說明與此索引。
