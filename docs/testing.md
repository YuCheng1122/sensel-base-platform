# Testing and Verification

All verification uses synthetic data, fake models or mocked HTTP transports. Do not call paid models, send real email or connect customer data sources.

PDF checks use system `pdftotext` (install `poppler-utils` on Ubuntu/Debian). Knip exempts only this explicitly documented system binary; CI installs it. This is not a blanket unused-code exclusion.

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

Without CORE_TEST_DATABASE_URL, `npm test` skips database integration. Release acceptance requires isolated localhost PostgreSQL with a name ending in `_audit`; migrate first and explicitly enable those tests. Skipped tests are not passes.

After loading an isolated test environment and confirming DATABASE_URL points to a disposable `*_audit` database:

```sh
export CORE_TEST_DATABASE_URL="$DATABASE_URL"
npm run db:migrate
npm test
npm run db:bootstrap
```

Bootstrap uses the same synthetic ADMIN_EMAIL/ADMIN_PASSWORD as browser login. These steps are not for an existing customer database.

Browser tests require running Web and the actual Python Agent with APP_ENV=test, AGENT_ALLOW_FAKE=true, MAIL_ALLOW_FAKE=true and SECURE_COOKIES=false. Configure BASE_URL/PUBLIC_APP_URL/BACKEND_URL and synthetic administrator credentials. Then:

```sh
npx playwright install chromium
npm run test:ui
```

Tests create synthetic users/groups/models/conversations/reports/mail records and modify platform/mail settings. Run only against disposable databases, then remove that isolated environment. Test results must contain no production data.

Also verify npm pack → generated external customer → independent install/typecheck/build/start, and Python wheel → new venv → health/readiness. Container verification requires clean PostgreSQL → migrations → bootstrap → Web/Agent health, not just Dockerfile syntax checks.

See [CI/CD](ci-cd.md) for workflow steps and [verification](verification.md) for recorded local results.

## Mail Verification

`packages/mail/tests/` uses mock HTTP to verify fixed endpoints, response bounds, version/enable gates, timeout/cancellation and no retries. Isolated database tests cover secret handling, persistent deduplication and authorization. Mail browser tests additionally require MAIL_ALLOW_FAKE=true with APP_ENV=test; AGENT_ALLOW_FAKE does not enable mail simulation. Never point this test flow at real Resend or use a live API key. Synthetic tests do not establish SMTP support, actual delivery, webhook handling or customer notification integration.
