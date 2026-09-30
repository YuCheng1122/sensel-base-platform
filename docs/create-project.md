# Create an Independent Customer Project

Packages can be built locally. GitHub Release workflows can also generate installation assets, but those exist remotely only after a release actually runs. Packages are not published to npm/PyPI. Initializing a template does not automatically apply future template updates.

```sh
npm run pack:core
uv build --project python
npm run create:project -- /tmp/customer-analysis --packages "$PWD/artifacts/packages"
cd /tmp/customer-analysis/web
npm install
npm run db:generate
npm run typecheck
npm run build
```

The generator refuses nonempty destinations and excludes node_modules/.next/.env and Python caches. Platform Dockerfiles are excluded because their build context is the platform workspace; customers must supply image recipes for their own packages and directories. `vendor/` holds explicitly versioned tgz files, referenced through relative file dependencies in web/package.json. When moving to a private registry, pin versions and regenerate the lockfile. All six packages (ui, chat, analytics, reports, mail, server) must be compatible.

Leave the web directory and return to the customer repository root (`cd /tmp/customer-analysis`). Create a Python venv and install the platform wheel. Load the necessary variables listed in agent/.env.example into the process environment, then run `uvicorn main:app --app-dir agent --port 8001`. Agent does not load .env implicitly. Lock production dependencies; do not use cross-repository PYTHONPATH or import platform source paths.

## Nginx and PCAP Extensions

For Nginx, add customer Prisma models/migrations, log parsers, authorized query services, pages and Agent tools. Elasticsearch is not required. For PCAP, the customer owns file storage, parsing, result schemas, queries and long-running job lifecycles; PCAP analysis is not built in.

Keep accounts/models/Chat in platform packages and customize customer navigation, tools and data scopes. Register each tool in both `web/src/server/core.ts`'s allowlist and `agent/main.py`'s ToolRegistry. Tool backends use `authorizeTool` to verify the execution profile and current account state.

The customer repository owns its schema, migrations, README, AGENTS, deployment and releases. Do not copy its business code back into platform core. Product completeness and data-volume acceptance require separate customer testing.

Mail is disabled by default. Customer server code can call `sendConfiguredMail`, with customer-owned recipient authorization, notification content and stable operation UUIDs. Do not expose an arbitrary-mail API to ordinary users. Apply the mail migration and configure the encryption key first. Synthetic tests require `MAIL_ALLOW_FAKE=true` and `APP_ENV=test`; production uses Resend with fake disabled. Creating a report snapshot does not send mail automatically. Scheduling/subscriptions remain customer work; see [mail service](mail-service.md).

The generator also copies DESIGN.md, CLAUDE.md and canonical project skills, exposing relative discovery links for Codex and Claude Code. These are independent customer-owned instructions after generation; package upgrades do not overwrite them. See [portable frontend skills](frontend-skills.md).


## Reuse and product-completeness requirements

Before composing customer pages, read DESIGN.md and the generated `docs/reuse-guide.md`. The template now includes distinct routes, editable chapter reports with draft preview, host/domain/event drill-down, paginated tables and quota display. Replace the synthetic analysis/exploration adapters with authorized customer implementations; configure a quota adapter for additional providers. See the [component catalog and recipes](reuse-guide.md) for actual exports and responsibilities.
