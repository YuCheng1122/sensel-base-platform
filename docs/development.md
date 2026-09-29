# 本地開發

支援 Node >=20.19、Python >=3.12；使用 repo package-lock.json 與 python/uv.lock。系統只有 Node18 時請切換版本，不能以略過 engine 警告當作驗證。

## 設定與初始化

```sh
npm ci
npm run db:generate
uv sync --project python --frozen
cp templates/project/web/.env.example templates/project/web/.env
```

修改 `.env` 指向自己建立的 PostgreSQL。範例密碼只是 placeholder，須替換。需要兩個獨立金鑰：32 bytes base64 的 SETTINGS_ENCRYPTION_KEY，以及至少32字元的 AGENT_SHARED_SECRET。不要將 `.env` commit。

若設定檔採相容 shell 的 `KEY=value` 格式，可在每個終端載入：

```sh
set -a
. templates/project/web/.env
set +a
export BACKEND_URL=http://localhost:3000
npm run db:migrate
npm run db:bootstrap
```

bootstrap 需 ADMIN_EMAIL／ADMIN_PASSWORD；帳號已存在時不覆寫。初次初始化後不必把管理員密碼傳給服務。不要以 db push 取代版本化 migration。

## 兩個服務

終端一 `npm run dev`；終端二 `uv run --project python uvicorn main:app --app-dir templates/project/agent --port 8001`。共用 AGENT_SHARED_SECRET，Web AGENT_URL 指向 Agent，Agent BACKEND_URL 指回 Web。Agent 不讀 Prisma 或資料庫憑證。

本地 HTTP 使用 SECURE_COOKIES=false、PUBLIC_APP_URL=http://localhost:3000。換成127.0.0.1或不同埠時，瀏覽器URL、PUBLIC_APP_URL、BACKEND_URL需一致。正式反向代理則填外部HTTPS origin。

合成 demo 須在 Web 和 Agent 都明確設定 APP_ENV=development（或 test）及 AGENT_ALLOW_FAKE=true，再從 UI 新增 fake model。預設不啟用；APP_ENV=production 拒絕 fake。郵件合成demo須另外在Web設定MAIL_ALLOW_FAKE=true，並保留同樣的APP_ENV條件；AGENT_ALLOW_FAKE不會啟用郵件fake。正式供應商呼叫可能產生費用，不是本地測試必要步驟。

## 正式模式檢查

```sh
npm run check
npm run dead-code
npm run docs:check
npm test
npm run build
PORT=3210 npm run start
```

`next start` 可以用於本地流程檢查；映像使用 Next standalone server。切換port需同步PUBLIC_APP_URL。不要對正在使用的同一個 .next 同時 build 與測試；重建後重啟才有新版本。
