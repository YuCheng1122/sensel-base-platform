# 測試與驗證

所有測試使用合成資料、假模型或假HTTP transport；不呼叫付費模型、不寄信、不接客戶來源。

PDF驗證使用系統 `pdftotext`（Ubuntu／Debian 安裝 `poppler-utils`）。Knip只豁免這個已明列的系統binary，CI會安裝它；不是忽略未使用程式。

```sh
npm ci
npm run db:generate
npm run check
npm run dead-code
npm run docs:check
npm test
uv sync --project python --frozen
uv run --project python ruff check python/src python/tests
uv run --project python pytest python/tests
npm run build
uv build --project python
```

一般 `npm test` 沒有CORE_TEST_DATABASE_URL時會略過DB整合。發布驗收必須建立隔離localhost PostgreSQL，資料庫名以 `_audit` 結尾，先migrate，再明確設定CORE_TEST_DATABASE_URL執行，不把skip算通過。

在已載入隔離測試環境、且DATABASE_URL確認指向可丟棄的`*_audit`資料庫後，DB驗收順序為：

```sh
export CORE_TEST_DATABASE_URL="$DATABASE_URL"
npm run db:migrate
npm test
npm run db:bootstrap
```

bootstrap使用同一組合成ADMIN_EMAIL／ADMIN_PASSWORD，供後續瀏覽器登入；上述步驟不適用既有客戶DB。

瀏覽器需先啟動Web與實際Python Agent；使用APP_ENV=test、AGENT_ALLOW_FAKE=true、MAIL_ALLOW_FAKE=true、SECURE_COOKIES=false，並設定BASE_URL／PUBLIC_APP_URL／BACKEND_URL與合成ADMIN_EMAIL／ADMIN_PASSWORD。安裝瀏覽器後：

```sh
npx playwright install chromium
npm run test:ui
```

測試會新增合成使用者／群組／模型／對話／報告及郵件紀錄，並修改平台與郵件設定；只對可丟棄的測試DB執行，完成後刪除此隔離環境。測試結果不含正式資料。

另驗：npm pack→repo外生成客戶→獨立install／typecheck／build／start；Python wheel→新venv→health/readiness。容器流程需乾淨PG→migration→bootstrap→Web/Agent health，不只檢查Dockerfile格式。

CI步驟見 [CI/CD](ci-cd.md)，本地本輪結果見 [驗證](verification.md)。

## 郵件驗證

`packages/mail/tests/`用mock HTTP驗證固定endpoint、回應界限、版本／啟停、逾時／取消及不重試；後端隔離DB驗證設定秘密、持久防重和權限。郵件瀏覽器測試需額外設定MAIL_ALLOW_FAKE=true，並維持APP_ENV=test；AGENT_ALLOW_FAKE不會開啟郵件fake。不得將測試流程指向真Resend或使用真API key。SMTP、實際送達、webhook與客戶通知整合不在這些合成測試的證明範圍。
