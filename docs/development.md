# Local Development

Use Node >=20.19 and Python >=3.12 with `package-lock.json` and `python/uv.lock`. If your system has Node 18, switch versions; ignoring engine warnings is not verification.

## Configuration and Initialization

```sh
npm ci
npm run db:generate
uv sync --project python --frozen
cp templates/project/web/.env.example templates/project/web/.env
```

Point `.env` at your own PostgreSQL instance and replace placeholder passwords. Generate two independent secrets: a 32-byte base64 `SETTINGS_ENCRYPTION_KEY` and an `AGENT_SHARED_SECRET` of at least 32 characters. Never commit `.env`.

If the file uses shell-compatible `KEY=value` syntax, load it in each terminal:

```sh
set -a
. templates/project/web/.env
set +a
export BACKEND_URL=http://localhost:3000
npm run db:migrate
npm run db:bootstrap
```

Bootstrap requires `ADMIN_EMAIL`/`ADMIN_PASSWORD` and leaves an existing account unchanged. Services do not need the administrator password after initialization. Use versioned migrations, not `db push`.

## Two Services

In terminal one run `npm run dev`. In terminal two run `uv run --project python uvicorn main:app --app-dir templates/project/agent --port 8001`. Share `AGENT_SHARED_SECRET`; Web's `AGENT_URL` points to Agent and Agent's `BACKEND_URL` points to Web. Agent does not read Prisma or database credentials.

For local HTTP use `SECURE_COOKIES=false` and `PUBLIC_APP_URL=http://localhost:3000`. When changing hostname or port, keep browser URL, `PUBLIC_APP_URL` and `BACKEND_URL` consistent. A production reverse proxy uses the external HTTPS origin.

A synthetic model demo requires `APP_ENV=development` (or `test`) and `AGENT_ALLOW_FAKE=true` in both services, followed by creating a fake model in the UI. Fake mode is off by default and prohibited in production. Mail simulation independently requires `MAIL_ALLOW_FAKE=true` in Web with the same environment restriction; `AGENT_ALLOW_FAKE` does not enable it. Real provider requests may incur charges and are not required for local verification.

## Production Build Checks

```sh
npm run check
npm run dead-code
npm run docs:check
npm test
npm run build
PORT=3210 npm run start
```

`next start` supports local workflow verification; the image runs Next's standalone server. Update `PUBLIC_APP_URL` when changing ports. Do not build and test the same active `.next` concurrently; restart after rebuilding to use the new version.
