# 首版驗證紀錄

日期：2026-09-28。以下為本地實際執行結果；不是遠端GitHub或客戶正式部署結果。

## 首版抽離檢查

| 檢查 | 結果 |
| --- | --- |
| npm lint／TypeScript／核心相依與模組大小 | 通過 |
| Knip死碼與相依盤點 | 通過，無未處理發現 |
| Web單元／真Prisma整合／串流parser | 10通過，0失敗，0略過 |
| Python Ruff／pytest | Ruff通過，21通過 |
| 正式Next.js build | 通過，瀏覽器基準Build ID `XPqnwh7Ewu1waaOKZutMc` |
| 正式模式瀏覽器 | 7通過：設定／模型測試／Chat回讀、取消／錯誤／partial、權限、個資／密碼、1440／390版面 |
| Python wheel獨立安裝 | 新venv從site-packages載入，health／readiness通過 |
| npm套件獨立客戶 | repo外安裝3個tgz、Prisma generate、型別及正式build通過 |
| 獨立客戶完整鏈 | 新DB migration／bootstrap→登入→模型連線與工具測試→default→真Python Agent→後端工具→SSE→歷史及trace回讀通過 |
| 生產容器 | Web、Agent、migration映像建置通過；全新PG、migration、bootstrap、health、登入及Secure／HttpOnly cookie通過 |
| 非root執行 | Web／migration UID1000，Agent UID10001 |
| 工作流程與Compose | YAML／設定驗證及對應本地步驟通過；未在GitHub執行 |
| 文件 | 相對連結與Markdown區塊檢查通過 |

## 驗證範圍

全程使用獨立合成PostgreSQL、明確啟用的假模型與新服務埠；沒有Elasticsearch／Redis。真Python Agent與Web透過HTTP互通，provider本身使用fake或mock HTTP；不代表真OpenAI／Anthropic／Gemini端點可用性或分析品質認證。

獨立客戶目錄為 `/tmp/sensel-base-consumer-final`，自己的DB為 `sensel_consumer_audit`；核心從tgz安裝，Python從wheel安裝，沒有原專案路徑或PYTHONPATH。這驗證可重用底座，不代表完成Nginx或PCAP產品。

本次未讀取來源.env或使用客戶DB，未外部寄信、呼叫付費模型或替換既有服務。來源工作區由另一個Agent微調，本次只讀取其程式。

## 容器映像證據

| 本地映像 | digest |
| --- | --- |
| sensel-base-web:final | sha256:bc990c1aa7294465e6b662a577ab33debc5dd9ea9a91e73edc314bbf9730334a |
| sensel-base-agent:local | sha256:67faeccc5637f379591ee96639f7ed3b035e8ab6a689b8a1977026bd2a780c7a |
| sensel-base-migrate:final | sha256:de3ff490587ad2a2e8736a3cb94e80ad3b2e50ae2ebd29d6950bf15725a443f8 |

上述映像對應首版抽離程式；後續UI還原使用下方另列映像。後續文件、專案產生器的Dockerfile排除規則及檔尾空白清理不改變執行語意。實際發布時仍由release workflow重建並記錄registry digest。

## 可重現入口及限制

檢查指令見 [測試指南](testing.md)、[CI/CD](ci-cd.md)。主要本地紀錄保留在 `/tmp/sensel-base-audit/`：`check-final.log`、`tests-final.log`、`python-final.log`、`dead-code-final.log`、`consumer-final-*.log`、`web-build-ui-final.log`、`final-container-smoke.log`、`final-container-images.json`。暫存秘密、瀏覽器trace與資料庫不納入版控。

生產Compose smoke的容器／network／volume已清除；其他驗證服務也在交付前停止，保留本地映像與log以便重跑。沒有push、GHCR發布或遠端部署。尚未提供的原產品能力列於 [搬移清冊](extraction-inventory.md)，不能以通過的測試數推定全部舊功能已搬完。


## UI 還原與交叉審查（2026-09-28）

依使用者要求，由三位 Agent 分別處理登入／殼層、Chat、瀏覽器驗證；主 Agent 整合設定頁並交叉審閱。原專案只讀；保留新的 CoreStore、Prisma 及獨立 Agent 邊界。

恢復原登入雙欄、Logo比例、Geist、原始tokens、浮動側欄、Chat配置，以及模型目錄／帳號編輯對話框。刪除舊版簡化布局和UI內的Chat樣式，樣式按責任拆分，production modules不超過400行。必要功能差異見 [DESIGN](../DESIGN.md)。

交叉審查另外修正：使用者／群組資料未完整載入時禁止修改，避免群組被清空；區分保存成功與刷新失敗；模型執行設定變更時清除預設；未知工具結果不顯示成功圖示。模型表單預設為真實provider、空模型ID；fake仍須明確選取且由伺服器環境允許。

- 靜態驗證：lint、TypeScript、架構、Knip與文件檢查通過；後端／Prisma／SSE測試10通過、0略過。
- 正式模式瀏覽器11項全部通過（14.2秒）：登入幾何／鍵盤、設定保存、模型連線與工具測試、Chat回讀、取消／斷流／未知狀態、權限與群組載入失敗防護。
- 正式Web build通過，最終瀏覽器建置ID `a1SCoKs3GNQdxiZatHQwn`。
- 獨立客戶 `/tmp/sensel-base-consumer-visual`：從3個tgz安裝、Prisma generate、typecheck及正式build通過；含新CSS、Geist與public資產。此項執行於最後Logo等比縮放的一行修正前，最終樣式另由Web及容器建置驗證。
- 目視比對原公開登入與新版1440／390截圖；另檢查新版Chat／設定／深色截圖。未登入客戶原站取得內部畫面，不宣稱全部頁面像素級一致。
- 新Web映像 `sensel-base-web:visual`：`sha256:090ad0c29ac78c99ad2a6b9a654020faea251449732ae5c85a63c0ff391cace2`。Python、資料庫schema及migration未改動，本輪未重跑Python測試。

本輪紀錄及合成截圖位於 `/tmp/sensel-base-visual/`；秘密、trace和截圖不入版控。

本機預覽 `http://localhost:3300` 已更新為新的Web映像；Web／Agent／PostgreSQL均healthy。以既有管理員完成登入，模型1筆、對話1筆保留，瀏覽器pageerror為0。只重建Web，未重置資料庫或停止其他專案服務。隔離驗證服務於交付前停止，3300預覽持續運作；尚未push或遠端發布。

## 共用分析／報告／設定擴充（2026-09-28）

三位Agent分別完成Analytics、Reports與後端儲存，主Agent整合導覽／共用設定並交叉檢查。新增功能說明見 [共用能力](analytics-and-reports.md)。

- `npm run check`：lint、根與Web型別、相依邊界／400行模組限制通過。
- `npm run dead-code`：無未處理發現。`pdftotext`為明列的系統工具，由CI安裝poppler-utils；僅豁免此非npm binary。
- `npm test`：22通過、0失敗、0略過，包括真Prisma持久層、並行設定版本衝突、owner隔離、來源失敗、圖表範圍與匯出。
- 中文PDF以真renderer生成12頁，Poppler確認中文、最後一筆明細、完整長敘述及每頁頁尾；實際查看封面及明細圖片。
- 正式Next build通過，瀏覽器14項全部通過（20.3秒）；含真JSON／CSV／PDF下載、來源離線下載既有快照、時區設定改變不改舊報告、設定回讀與手機版。
- `npm pack`五套件→`/tmp/sensel-base-consumer-features`獨立安裝、Prisma generate、typecheck、正式build全部通過，中文字型／授權與public資產完整帶入，無原workspace程式相依。
- 事件概覽、報告預覽、平台設定1440／390與概覽暗色共7張合成截圖已實際檢查，無頁面水平溢出；手機表格於自身容器橫向捲動。

新增migration在隔離資料庫由空庫依序套用兩個migration並bootstrap通過。Python runtime及Agent映像未變，沿用先前驗證；本輪真Agent參與全部原Chat瀏覽器回歸。CI增加PDF文字驗證的系統工具，本地對應步驟已跑，尚未在GitHub執行。

本輪logs與合成截圖位於 `/tmp/sensel-base-features/`，PDF文字／圖片檢查在 `/tmp/sensel-base-visual/reports-cjk-long.pdf` 及同目錄圖片。資料與產物均未納入版控。

容器與既有資料升級亦已完成：

- 最終本機瀏覽器build ID：`PeUKrjHpMPD7WPoNy2A4M`。
- Web `sensel-base-web:features`：`sha256:9d3abf797e357ef312805fa1b50f765f366fba0aaabf512f5e90cd8c0488b26d`。
- Migration `sensel-base-migrate:features`：`sha256:0dc3c6b9b8cb03ffcfaf80b9a978ab14b0bca4b52699824a9ac97dbe14053e82`。
- 先將本機預覽資料庫備份至私有暫存檔，再只套用`202609280002_feature_modules`。未reset／重新bootstrap；既有模型1筆、對話1筆與原管理員登入均保留。
- `localhost:3300` 的Web／Agent／PostgreSQL healthy；實際開啟概覽、保存一份標示合成的「SenseL 共用功能示範報告」、下載131464 bytes的真PDF，快照回讀一致，瀏覽器pageerror為0。
- 已停止隔離測試Web／Agent及測試PostgreSQL；3300預覽繼續運作。没有push、registry發布或遠端部署。
