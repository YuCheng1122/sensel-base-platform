# 資料儲存與 Prisma

Prisma是ORM；PostgreSQL是實際資料庫。每個客戶維護一份schema、一個generated client及一個migration序列。平台server套件只依賴CoreStore介面，具體adapter在範本 `web/src/server/prisma-store.ts`。

核心契約包含User、Group、Session、ModelConnection、Chat、ChatMessage、AuditEvent。ChatMessage保存文字、execution ID、狀態及遮蔽後工具trace；Session保存雜湊token而非cookie明文。ModelConnection金鑰以AES-256-GCM保存，API不回傳明文。

本版群組是身分管理基礎，沒有假設SOC vendor/site scope。客戶必須在業務資料查詢加入自己的資源權限；不能只隱藏前端選單。示範工具僅回傳目前使用者的對話數量。

資料庫migration不由套件import或一般服務啟動隱式執行。使用 `npm run db:migrate` 或Compose一次性migrate服務。新的核心schema版本須提供遷移說明，客戶整合後在隔離DB驗證。

原Digiwin的schema及migration未搬入；不得拿新migration覆蓋舊DB。未來接回時，需逐表mapping、歷史資料讀回、加密資料相容與還原演練。

Nginx可以把log存PostgreSQL；有ES需求的專案另行安裝adapter、定義mapping與索引生命周期。PCAP原始檔不必塞進資料庫，可存檔案／物件儲存，DB記錄索引和分析結果。平台不提供通用SQL-to-ES轉換層。
