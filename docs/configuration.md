# 設定參考

Web 範例為 `templates/project/web/.env.example`；Compose 範例為 `deploy/.env.example`。秘密沒有可用預設值。變更 runtime 環境設定後需重啟相關服務；UI 模型設定依保存版本在新請求生效。

| 變數 | 讀取者 | 說明 |
| --- | --- | --- |
| DATABASE_URL | Web／Prisma | 必填 PostgreSQL URL，屬秘密；Agent 不需要 |
| SETTINGS_ENCRYPTION_KEY | Web | 必填32-byte base64，加密保存模型金鑰；與 DB 一起妥善備份，不能任意替換 |
| AGENT_SHARED_SECRET | Web／Agent | 必填至少32字元，跨服務驗證及 profile 簽署；兩邊一致 |
| AGENT_URL | Web | Agent 服務位址；程式預設 http://127.0.0.1:8000；設定範例改用 http://127.0.0.1:8001 |
| BACKEND_URL | Agent 範本 | 客戶工具回連的 Web 位址；預設 http://127.0.0.1:3000 |
| PUBLIC_APP_URL | Web | 可信任瀏覽器 origin；正式部署必填，含scheme/host/port、不含path；不信任任意 forwarded host |
| MODEL_ALLOWED_ENDPOINTS | Web | 逗號分隔的精確模型baseURL allowlist；OpenAI-compatible自訂端點必須符合；內網端點由部署者明確加入 |
| SECURE_COOKIES | Web | 預設true；只在本地HTTP測試設false |
| APP_ENV | Web／Agent | production／development／test；明確非正式模式才能啟用fake |
| AGENT_ALLOW_FAKE | Web／Agent | 預設false，僅合成開發測試；production禁止 |
| ADMIN_EMAIL／ADMIN_PASSWORD | bootstrap | 初次建立管理員用；密碼12–72字元，不是每次啟動的必要設定 |
| BASE_URL | browser tests | 測試Web origin，預設 http://127.0.0.1:3210 |
| CORE_TEST_DATABASE_URL | DB tests | 明確opt-in的隔離localhost PostgreSQL，資料庫名以_audit結尾 |

Anthropic/Gemini 使用各自預設官方端點；自訂baseURL仍須allowlist。未呼叫真provider的合成測試不能證明正式端點可用。

範本不要求 ES_HOST、REDIS_URL 或原 Digiwin 的環境變數。新增選配儲存時由客戶明列用途與啟停需求。
