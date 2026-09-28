# 測試與驗證

所有測試使用合成資料、假模型或假HTTP transport；不呼叫付費模型、不寄信、不接客戶來源。

```sh
npm ci
npm run db:generate
npm run check
npm test
uv sync --project python --frozen
uv run --project python ruff check python/src python/tests
uv run --project python pytest python/tests
npm run build
uv build --project python
```

一般 `npm test` 沒有CORE_TEST_DATABASE_URL時會略過DB整合。發布驗收必須建立隔離localhost PostgreSQL，資料庫名以 `_audit` 結尾，先migrate，再明確設定CORE_TEST_DATABASE_URL執行，不把skip算通過。

瀏覽器需先啟動Web與實際Python Agent；使用APP_ENV=test、AGENT_ALLOW_FAKE=true、SECURE_COOKIES=false，並設定BASE_URL／PUBLIC_APP_URL／BACKEND_URL與合成ADMIN_EMAIL／ADMIN_PASSWORD。安裝瀏覽器後：

```sh
npx playwright install chromium
npm run test:ui
```

測試會新增合成使用者／群組／模型／對話；只對可丟棄的測試DB執行，完成後刪除此隔離環境。測試結果不含正式資料。

另驗：npm pack→repo外生成客戶→獨立install／typecheck／build／start；Python wheel→新venv→health/readiness。容器流程需乾淨PG→migration→bootstrap→Web/Agent health，不只檢查Dockerfile格式。

CI步驟見 [CI/CD](ci-cd.md)，本地本輪結果見 [驗證](verification.md)。
