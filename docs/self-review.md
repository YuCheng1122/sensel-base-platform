# Reviewing SenseL Base Yourself

This guide separates visual acceptance, code reading and automated checks. Confirm that the shared foundation meets your needs, then inspect evidence. Passing tests do not mean customer Nginx/PCAP analysis is complete.

## 1. Inspect the UI: About 15–20 Minutes

The local preview is currently http://localhost:3300; use your existing administrator account. Do not run automated tests against this preview with retained data. Use explicitly labelled test data for any manual writes.

| Area | Action | Expected result |
| --- | --- | --- |
| Login/profile | Sign in, refresh, inspect profile, sign out | Correct session behavior and clear errors; passwords never displayed |
| Users/groups | Inspect roles/groups; edit only test accounts | Administration is separate from ordinary-user navigation |
| Models | Inspect saved configuration, key presence and test status | Keys hidden; saving is not successful testing; synthetic models labelled |
| Conversations | Use a synthetic model, stop a reply, reopen history | Cancellation/failure distinct from completion; tool details and history retained |
| Event overview | Change source and range | Metrics/charts/table agree; synthetic/partial data is identified |
| Reports | Open an existing sample and export PDF/CSV/JSON | Readable Chinese PDF; downloads match the stored snapshot instead of recollecting |
| Platform settings | Inspect name, time zone, report defaults and audit | Saved version displayed; edits survive refresh |
| System settings → 信件服務 | Inspect sender configuration, version and receipts | Keys hidden, initially disabled; provider acceptance is not delivery |
| Mobile | Set viewport width to 390px; check login, sidebar, overview, reports and mail | Usable controls; tables scroll within their own containers |

If the preview has no available synthetic model, inspect existing history and run synthetic execution in the isolated environment below. Real provider calls are not required for review.

For mail tests choose only “合成測試（不寄信）”, requiring a non-production environment and MAIL_ALLOW_FAKE. If that option is unavailable, inspect without sending or entering a real key. Resend sends actual mail and is not a side-effect-free acceptance check.

## 2. Read Documents and Directories: About 10 Minutes

Read [README](../README.md) → [architecture](architecture.md) → [extraction inventory](extraction-inventory.md) → [create a project](create-project.md). The inventory separates extracted and customer-owned capabilities. Coding agents start at [AGENTS.md](../AGENTS.md).

| Location | What to inspect |
| --- | --- |
| `packages/ui`, `chat` | Reusable presentation and interaction, not customer queries |
| `packages/analytics`, `reports` | Generic chart/snapshot contracts with injected data |
| `packages/mail` | Mail contracts/transports without customer alert rules |
| `packages/server` | Auth, settings, conversations, reports and mail through CoreStore |
| `python/src/sensel_agent` | Installable runtime, providers and tool execution |
| `templates/project` | Customer composition, Prisma schema/adapters, routes and tools |
| `.github/workflows`, `deploy` | CI, releases and deployment configuration; no automatic customer deployment |

A reusable design lets Nginx/PCAP work add customer tables, AnalysisProvider, tools and pages without putting business logic in shared packages. Prisma belongs in customer adapters; Elasticsearch is not required to start. Independent customer projects do not imply shared-deployment multitenant isolation.

## 3. Run Local Checks

From the repository root, use Node >=20.19 and Python >=3.12. Do not build the same `.next` directory while it serves an acceptance session. Use an isolated checkout or generated customer for production builds.

```sh
npm ci
npm run db:generate
npm run check
npm run dead-code
npm run docs:check
npm audit
uv sync --project python --frozen
uv run --project python ruff check python/src python/tests
uv run --project python pytest python/tests
```

`check` covers lint, types, core boundaries and module length. `dead-code` identifies unused-code/dependency candidates. `docs:check` checks local links and Markdown fences, not factual correctness. `audit` reflects advisories available when run; it is not a guarantee of no vulnerabilities.

`npm test` skips DB integration without CORE_TEST_DATABASE_URL. Full acceptance needs disposable PostgreSQL, Web and Agent; see [testing](testing.md) and [CI workflow](../.github/workflows/ci.yml):

1. Use an isolated DB ending in `_audit`; DATABASE_URL and CORE_TEST_DATABASE_URL point to that same DB.
2. Set synthetic keys/administrator and dedicated ports. Use APP_ENV=test and AGENT_ALLOW_FAKE=true for Web/Agent, plus MAIL_ALLOW_FAKE=true for Web.
3. Migrate → `npm test` → build → bootstrap → start Web/Agent → `npm run test:ui`.
4. Require no failures or unexpected skips, then remove only that isolated environment. Never use preview/customer databases.

To verify another project can actually be created, follow [the project guide](create-project.md): pack six tgz archives, generate into an empty external directory, install, generate Prisma, typecheck and build. CI also verifies no installed package points back to workspace source, versions match and dependency overrides survive.

## 4. Inspect GitHub CI/CD

Open repository Actions → **Platform CI** and verify the run belongs to the intended commit, not an older green result.

- `verify`: installation, types/lint/docs/dead-code, real DB tests, Python tests, independent packages/wheel and browser tests must pass.
- `containers`: three image builds plus clean-database migration/bootstrap/health/login must pass.
- On failure, inspect the first failed step. Download `platform-test-results` and `platform-service-logs`; service logs may be absent if startup was never reached. Open a Playwright trace with `npx playwright show-trace /path/to/trace.zip`.
- `platform-packages` should contain six npm tgz files plus a Python wheel/source distribution.

**Platform release** runs only when publishing a GitHub Release. Do not use publishing as a test button. It validates versions and runs full CI before publishing GHCR images and release attachments, without deploying customer hosts. Tags, package versions and internal dependency pins must match. Deploy using the image digest from job summaries; see [CI/CD](ci-cd.md).

Local success and workflow files do not prove GitHub execution. Remote status must come from an actual Actions run.

## 5. Report a Problem

Include page/feature, steps, expected/actual behavior, viewport width and commit. Screenshots or API status codes help; never include passwords, API keys, cookies or raw customer data.

The [verification record](verification.md) lists fixes, actual test results and limits. Real provider behavior, mail delivery, production HTTPS/recovery, and Nginx/PCAP integration require their own environment acceptance.
