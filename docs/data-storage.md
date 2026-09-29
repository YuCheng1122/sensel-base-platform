# 資料儲存與 Prisma

Prisma是ORM；PostgreSQL是實際資料庫。每個客戶維護一份schema、一個generated client及一個migration序列。平台server套件只依賴CoreStore介面，具體adapter在範本 `web/src/server/prisma-store.ts`。

核心契約包含User、Group、Session、ModelConnection、Chat、ChatMessage、AuditEvent。ChatMessage保存文字、execution ID、狀態及遮蔽後工具trace；Session保存雜湊token而非cookie明文。ModelConnection金鑰以AES-256-GCM保存，API不回傳明文。

本版群組是身分管理基礎，沒有假設SOC vendor/site scope。客戶必須在業務資料查詢加入自己的資源權限；不能只隱藏前端選單。示範工具回傳目前使用者近期對話數（recentConversationCount，historyLimit=100），不宣稱歷史總數。

資料庫migration不由套件import或一般服務啟動隱式執行。使用 `npm run db:migrate` 或Compose一次性migrate服務。新的核心schema版本須提供遷移說明，客戶整合後在隔離DB驗證。

原Digiwin的schema及migration未搬入；不得拿新migration覆蓋舊DB。未來接回時，需逐表mapping、歷史資料讀回、加密資料相容與還原演練。

Nginx可以把log存PostgreSQL；有ES需求的專案另行安裝adapter、定義mapping與索引生命周期。PCAP原始檔不必塞進資料庫，可存檔案／物件儲存，DB記錄索引和分析結果。平台不提供通用SQL-to-ES轉換層。

## 共用分析與報告

新增 `PlatformSettings`、`PlatformSettingsAudit`、`ReportSnapshot` 由範本Prisma adapter擁有；migration只新增表，不重設舊資料。報告保存完整JSON快照，以ownerId限制存取；客戶業務事件仍屬客戶schema或儲存服務，不進平台資料表。設定寫入與before／after紀錄同交易提交。詳見 [共用功能](analytics-and-reports.md)。

## 郵件設定與投遞

`202609290001_mail`新增`MailConfiguration`、`MailDelivery`與`MailSettingsAudit`。設定金鑰使用同一AES-256-GCM加密介面；設定及before／after審計同交易保存，審計僅含hasApiKey與secretChanged，不保存秘密。管理員交易使用共用PostgreSQL advisory transaction lock，序列化授權、版本檢查和防重預留。

投遞先以資料庫唯一UUID idempotencyKey建立unknown預留，再執行外部HTTP。相同actor／內容／設定版本只讀回原結果，不重新寄送；不同內容或actor重用key回409。保留收件者、主旨、版本、內容HMAC指紋與供應商receipt，不保存郵件本文。unknown可能代表仍在處理、程序中斷或結果保存失敗，不能刪除紀錄後自動重寄。此範本每客戶獨立DB，未提供共享多租戶schema或自動清理投遞紀錄。詳細語意見 [郵件服務](mail-service.md)。
