# 客戶升級

1. 閱讀release說明及核心schema／API變更。
2. 在客戶分支更新平台六個npm套件及Python wheel至同一相容版本，更新lockfiles。
3. 範本產生的routes／adapter／入口檔由客戶擁有；根據遷移說明調整，不重新生成並覆蓋客戶程式。
4. 先在隔離DB套migration，驗證登入／歷史資料／模型／工具及客戶查詢。
5. 備份並記錄上一版本套件與image digests，再依客戶流程發布。

第一版尚無從Digiwin資料庫原地升級腳本；它是新底座。接回原專案需逐功能替換、保留舊API的必要相容層並驗證後才移除重複實作。

核心修正只做一次並發新版本；客戶自行決定採用時間，不手動複製packages中的原始碼維護第二份。

郵件擴充需帶入`@sensel/mail`、MailStore adapter及`202609290001_mail` migration；套件安裝不會自動更新客戶schema。保留原SETTINGS_ENCRYPTION_KEY與投遞ledger，避免既有金鑰無法解密或相同操作重寄。驗證同key重放、版本衝突、停用與權限、unknown語意，再啟用真provider。未提供加密金鑰自動輪替／舊郵件資料搬移工具。
