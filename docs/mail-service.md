# 共用郵件服務

郵件能力供不同客戶的通知及報告流程使用。`@sensel/mail`提供純TypeScript transport與runtime；`@sensel/server`的`sendConfiguredMail`協調授權、設定解密、版本檢查及持久防重；`@sensel/ui`提供管理員設定、固定內容測試與投遞紀錄。具體Prisma adapter與migration由客戶專案擁有。一般使用者沒有任意收件者／本文的寄信API。

## 管理流程

在郵件設定選擇Resend、填入寄件者名稱／地址與API key，保存後才能測試當前版本。預設停用；啟用Resend需有保存的key。空白key表示保留既有值，UI與讀取API只有hasApiKey，不回傳明文或密文。保存攜expectedVersion，過期版本回409；設定與去秘密before／after審計在同一交易提交。現階段沒有郵件設定審計列表API。

測試只接受一個收件者、expectedVersion與UUID idempotencyKey；主旨／本文固定於server。投遞紀錄供管理員分頁檢視本專案操作。UI保留目前操作key，在不確定結果時查閱既有紀錄；建立另一個操作是明確的新寄送，可能重複，不能當成安全自動重試。

## 狀態與防重

| 狀態 | 意義 |
| --- | --- |
| accepted | 供應商返回有效message ID，未證明送達或閱讀；synthetic另有明確標示 |
| rejected | 輸入／設定不合法，或供應商明確拒絕 |
| cancelled | 已知在呼叫供應商前停止，例如版本變更、停用或授權失效 |
| unknown | 可能仍在執行，也可能已寄出；逾時、中斷、無效receipt、HTTP 408／409／5xx或結果保存失敗均可能如此 |

範本每客戶獨立DB，idempotencyKey是全DB唯一UUID。相同actor及訊息指紋（含設定版本）重放只回原紀錄；相同key配不同actor或內容回409。先建立unknown預留再呼叫供應商；沒有自動重寄或自動清理此ledger。程序在HTTP後中斷也不會因再送相同key而再次dispatch。儲存收件者與主旨供查核，但不保存郵件本文；內容比對使用HMAC指紋。

[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)的供應商防重窗口是24小時，key最多256字元；平台持久ledger不能用此窗口替代，也不承諾收件匣exactly-once。accepted與delivered是不同的[供應商事件](https://resend.com/docs/webhooks/event-types)，本版沒有webhook處理或送達回查。

## 客戶程式接入

優先在客戶server呼叫`sendConfiguredMail(coreConfig, actorId, message)`，message契約來自`@sensel/mail/contracts`。目前範本MailStore要求有效管理員actor；客戶若需要排程service identity或業務通知，必須明確實作其授權，不可僅為繞過檢查而使用任意管理員ID。收件者授權、HTML跳脫、通知內容及操作UUID由客戶業務流程負責。server coordinator目前限制最多10收件者、主旨200字元、text64000／html128000字元。

直接使用`@sensel/mail`的`sendMail`只提供傳輸與基本檢查，不含資料庫或授權。自訂儲存層須在傳送前完成持久預留、讀取當前設定及版本核對；同key未知結果不可再dispatch。可注入MailTransport替換供應商，transport由可信server程式決定，UI不能輸入任意endpoint。

## 秘密、環境與範圍

`SETTINGS_ENCRYPTION_KEY`同時保護模型／郵件key，並用於郵件指紋；與資料庫一起妥善備份，未提供自動輪替流程。`MAIL_ALLOW_FAKE=true`且`APP_ENV=test`或`development`才允許fake；這與AGENT_ALLOW_FAKE分開。正式環境關閉fake，不能將合成receipt顯示為真郵件。

Resend使用固定`https://api.resend.com/emails`，禁止redirect；預設14秒含body讀取，receipt最多128KiB，不回傳raw provider error。SMTP、附件、webhook、queue、排程、訂閱及報告自動寄送均未內建；可以由客戶在清楚的授權與防重流程上擴充。伺服器呼叫前會重讀設定，已開始的外部請求不承諾能因隨後停用而撤回。

端點見 [API契約](api-contract.md)，資料表見 [儲存](data-storage.md)，mock／synthetic驗證方式見 [測試](testing.md)，來源改動見 [Mail抽離記錄](../packages/mail/EXTRACTION.md)。

合成provider不解密或使用先前保存的Resend key；切換成fake不等於移除該key。回到Resend時才在server解密使用，金鑰仍由既有加密與版本流程管理。
