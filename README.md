# SenseL Base Platform

[![Platform CI](https://github.com/AvocadoAI-Lab/sensel-base-platform/actions/workflows/ci.yml/badge.svg?branch=development)](https://github.com/AvocadoAI-Lab/sensel-base-platform/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A520.19-339933?style=flat)](docs/development.md)
[![Python](https://img.shields.io/badge/Python-%E2%89%A53.12-3776AB?style=flat)](python/README.md)

不同客戶、不同分析用途共用的應用程式與 Agent 底座。

[文件首頁](docs/README.md) · [開始使用](docs/development.md) · [建立客戶專案](docs/create-project.md) · [自行驗收](docs/self-review.md)

## Table of Contents

1. [About SenseL](#about-sensel)
2. [Screenshots](#screenshots)
3. [Getting Started](#getting-started)
4. [Documentation](#documentation)
5. [Contributing](#contributing)
6. [Project Status](#project-status)

## About SenseL

SenseL Base Platform 提供帳號、群組、模型管理、Agent 對話、共用圖表、報告與郵件服務。新的客戶專案可以沿用這些基礎功能，再加入自己的資料模型、分析工具與頁面。

例如，Nginx Web Logs 專案可使用 Prisma／PostgreSQL 保存與查詢資料；未來的 PCAP 專案則可接入自己的檔案儲存與解析流程。Elasticsearch 是客戶可選的整合，不是底座的啟動需求。

### Features

- **帳號與設定**：登入、使用者／群組／角色、個人資料、平台名稱與時區。
- **模型與 Agent**：加密模型設定、連線／工具能力測試、OpenAI 相容／Anthropic／Gemini provider，以及客戶工具註冊。
- **對話分析**：歷史、串流、取消、工具紀錄與部分／失敗狀態。
- **事件概覽**：共用指標、趨勢、分類及事件列表；透過客戶提供者接入資料。
- **報告下載**：保存快照、預覽、搜尋及中文 PDF／CSV／JSON 匯出。
- **信件服務**：Resend、加密設定、管理員測試與投遞紀錄；未知結果不自動重寄。
- **專案基礎**：六個 TypeScript 套件、Python runtime、Prisma 範本、專案產生器及 CI/CD。

共用程式放在 `packages/` 與 `python/`，客戶組合範本放在 `templates/project/`。平台不內含 SOC、Nginx 或 PCAP 分析產品；各客戶 repo 擁有自己的資料、工具、提示詞與部署。詳見 [架構](docs/architecture.md) 與 [搬移清冊](docs/extraction-inventory.md)。

## Screenshots

以下為底座實際介面；概覽中的數字與帳號為合成示範資料。截圖版本及來源見 [圖片說明](docs/images/README.md)。

**登入與品牌介面**

<kbd>![SenseL 登入畫面：左側帳號表單與右側品牌面板](docs/images/login.png)</kbd>

**事件概覽與共用圖表**

<kbd>![SenseL 事件概覽：合成資料來源、指標卡與事件趨勢](docs/images/overview.png)</kbd>

信件設定與投遞狀態的畫面見 [信件服務指南](docs/mail-service.md#畫面預覽)。

## Getting Started

### Installation

開發環境需要 Node.js >=20.19、Python >=3.12、npm、uv 與 PostgreSQL 15。

- [本地安裝與啟動 Web／Agent](docs/development.md)
- [環境變數、金鑰與管理員初始化](docs/configuration.md)
- [Docker Compose 部署與回復](docs/deployment.md)

### Create a Customer Project

在已安裝依賴的底座 repo 根目錄執行：

```sh
npm run pack:core
npm run create:project -- /tmp/my-analysis-project --packages "$PWD/artifacts/packages"
```

產生獨立的 `web/`、`agent/` 與文件，不覆蓋既有非空目錄。Python wheel 需另行建置與安裝；完整步驟見 [建立客戶專案](docs/create-project.md)。

### Using SenseL

- [逐頁操作與自行驗收](docs/self-review.md)
- [事件概覽、圖表與報告](docs/analytics-and-reports.md)
- [信件設定、測試與投遞紀錄](docs/mail-service.md)
- [Agent 執行與工具擴充](docs/agent-runtime.md)

## Documentation

從 [文件首頁](docs/README.md) 選擇閱讀路線，或直接查看：

| 主題 | 文件 |
| --- | --- |
| 架構與擴充 | [責任邊界](docs/architecture.md) · [目錄規範](docs/code-organization.md) · [API 契約](docs/api-contract.md) |
| 儲存與模型 | [Prisma／資料儲存](docs/data-storage.md) · [Python runtime](python/README.md) |
| 品質與維運 | [測試](docs/testing.md) · [CI/CD](docs/ci-cd.md) · [升級](docs/upgrading.md) |
| 設計與驗證 | [UI 規範](DESIGN.md) · [搬移清冊](docs/extraction-inventory.md) · [驗證紀錄](docs/verification.md) |

## Contributing

修改平台前，請先閱讀 [貢獻指南](CONTRIBUTING.md)。其中說明共用與客戶程式的歸屬、必要檢查，以及提交變更時應提供的驗證資訊。

- 開發者：[本地開發](docs/development.md) · [測試指南](docs/testing.md)
- Coding Agent：[AGENTS.md](AGENTS.md)
- 問題回報：[如何描述與重現問題](CONTRIBUTING.md#回報問題)

## Project Status

目前為第一版共用底座，套件採本地 tgz／wheel 安裝；GitHub Release 工作流程可發布安裝附件，但尚未發布至 npm／PyPI。頂端 CI 徽章連結至 `development` 分支的實際工作流程狀態，不代表正式部署結果。

目前驗證範圍為單一 Web／Agent instance。通知訂閱／排程、完整帳號／模型稽核 UI、settings operation replay、分散式取消、長任務恢復與舊客戶資料遷移尚未完成。最新實測與限制見 [驗證紀錄](docs/verification.md)。
