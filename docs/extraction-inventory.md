# 搬移與清理清冊

來源：Digiwin 工作區的 `sensel-full-stack` 與 `sensel-agent`。來源 HEAD 分別為 `c206fd1b2cd2c2ca29faae0811b94d1741d276da` 與 `8149b847fa28b6ff93346079a85cd1a9a3df7763`，但來源含未提交修改，因此不能只用 HEAD 重建；套件清冊保留實際讀取檔案摘要。

| 能力 | 去向 | 處置與驗證邊界 |
| --- | --- | --- |
| UI tokens／表單／管理版型 | @sensel/ui | 保留原登入、浮動側欄與管理配置，拆除客戶依賴；樣式依責任拆分，不複製未使用shadcn元件／SOC卡片 |
| Chat／工具紀錄 | @sensel/chat | 還原原Chat側欄、歡迎頁、訊息／輸入與工具面板；保留歷史、SSE與取消，Markdown不啟用raw HTML、不綁資安事件 |
| 共用圖表／事件概覽 | @sensel/analytics | 原版配置、時間與來源篩選、指標／趨勢／分類／事件表；注入客戶提供者，資料完整性明列 |
| 報告下載／PDF／CSV／JSON | @sensel/reports＋server | 保存一次的快照、擁有者授權、預覽／匯出；CJK字型、長文分頁及分類向量圖；不搬SOC報告schema |
| 平台設定／變更紀錄 | ui＋server＋Prisma adapter | 名稱、時區、報告預設、版本衝突與交易內before／after；不宣稱所有舊設定操作都有稽核UI |
| 認證／users／groups | @sensel/server＋Prisma adapter | 重新組合為CoreStore；opaque DB sessions；不保留NextAuth provider或Digiwin ACL欄位 |
| 秘密加密 | @sensel/server/secrets | 保留gcm1 AES-GCM格式；真實資料尚未遷移，不宣稱舊DB直接相容 |
| 模型設定 | server＋Python | provider基本文字／tools、版本綁定連線／能力檢查、預設門檻；不保留舊模型目錄稽核UI |
| Agent執行 | sensel-agent-core | 選擇性重實作短效profile、隔離provider、限制／取消／狀態；改為新HTTP協定，不與原Agent wire compatible |
| Trace遮蔽 | Python trace.py | 從原domain-neutral遮蔽實作抽出，移除SOC事件引用收集 |
| 儲存／migration | 客戶範本 | 全新核心schema與initial migration；不複製客戶歷史、source索引或customer fixtures |
| 工程／部署 | root scripts、deploy、workflows | 依新repo重新整理；最小Compose無ES/Redis；獨立套件consumer驗證 |

詳列來源與調整：[UI](../packages/ui/extraction-manifest.json)、[Chat](../packages/chat/extraction-manifest.json)、[Analytics](../packages/analytics/extraction-manifest.json)、[Reports](../packages/reports/extraction-manifest.json)、[Server](../packages/server/EXTRACTION.md)、[Python](../python/README.md)。

## 留原專案與延後

SOC adapters、ES mapping、事件／主機分析、IoC／MITRE、FP／降噪、案件、SOC專用報告資料與分析內容、客戶站點及原提示詞留Digiwin。來源repo未刪檔或改動，尚未改成消費新套件。

通知寄送、接入排程、settings operation replay、完整帳號／模型設定稽核UI、分散式取消、durable任務及舊資料遷移未列為這個首版已完成能力。它們需要按新契約另行抽取與驗證，不能把原repo存在同名功能當成新平台已具備。

## 清理結果

核心沒有Prisma generated client、Elasticsearch、BullMQ／Redis、SOC graph或客戶路徑相依。Python未攜帶LangChain／LangGraph／LiteLLM、asyncpg、Tavily、OpenCC、tiktoken；新的精簡provider adapter只承諾本版明列能力。

本次Knip候選已處理：移除未使用react-dom型別直接相依，啟用實際Next lint config，補列bootstrap／測試真正使用的bcrypt與Prisma。公開套件entry由manifest exports定義。沒有靠大範圍ignore把發現隱藏。

根據入口、跨服務及打包結果保留必要的薄adapter；沒有將不同責任硬合併成單一utils。原碼未整包匯入，因此也沒有把客戶秘密／資料或歷史build帶入新repo。詳細檢查數據以驗證紀錄為準。
