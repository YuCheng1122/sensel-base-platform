# Verification Record

Initial date: 2026-09-28. The following records describe checks actually executed locally, not remote GitHub runs or customer production deployments. Each section applies to its recorded version.

## Initial Extraction Checks

| Check | Result |
| --- | --- |
| npm lint/TypeScript/core dependencies/module size | Passed |
| Knip dead-code/dependency review | Passed, no unresolved findings |
| Web unit/real Prisma integration/stream parser | 10 passed, 0 failed, 0 skipped |
| Python Ruff/pytest | Ruff passed; 21 tests passed |
| Production Next.js build | Passed; browser baseline build ID `XPqnwh7Ewu1waaOKZutMc` |
| Production-build browser tests | 7 passed: settings/model tests/Chat reload, cancellation/error/partial, authorization, profile/password, 1440/390 layouts |
| Independent Python wheel install | New venv imported from site-packages; health/readiness passed |
| Independent npm customer | 3 external tgz installs, Prisma generation, types and production build passed |
| Independent customer end-to-end flow | Fresh DB migrations/bootstrap → login → model connection/tool tests → default → actual Python Agent → backend tool → SSE → history/trace reload passed |
| Production containers | Web/Agent/migration images built; fresh PostgreSQL, migrations, bootstrap, health, login and Secure/HttpOnly cookies passed |
| Non-root execution | Web/migration UID1000; Agent UID10001 |
| Workflows/Compose | YAML/configuration and corresponding local steps passed; not executed on GitHub |
| Documentation | Relative links and Markdown fences passed |

## Verification Scope

All checks used isolated synthetic PostgreSQL, explicitly enabled fake models and dedicated service ports, without Elasticsearch/Redis. Actual Python Agent and Web communicated over HTTP, but providers used fake or mocked HTTP. This is not certification of real OpenAI/Anthropic/Gemini availability or analysis quality.

The independent customer directory was `/tmp/sensel-base-consumer-final`, with database `sensel_consumer_audit`. Core installed from tgz and Python from wheel, without original-project paths or PYTHONPATH. This demonstrates a reusable foundation, not a completed Nginx or PCAP product.

Source .env files and customer databases were not read. No external email, paid model calls or replacement of existing services occurred during these checks. Another agent was tuning the source workspace; extraction only read its code.

## Container Image Evidence

| Local image | Digest |
| --- | --- |
| sensel-base-web:final | sha256:bc990c1aa7294465e6b662a577ab33debc5dd9ea9a91e73edc314bbf9730334a |
| sensel-base-agent:local | sha256:67faeccc5637f379591ee96639f7ed3b035e8ab6a689b8a1977026bd2a780c7a |
| sensel-base-migrate:final | sha256:de3ff490587ad2a2e8736a3cb94e80ad3b2e50ae2ebd29d6950bf15725a443f8 |

These images correspond to initial extraction; subsequent UI restoration images appear below. Later documentation, generator Dockerfile exclusions and trailing-whitespace cleanup did not change runtime semantics. Actual releases rebuild through the release workflow and record registry digests.

## Reproduction and Limits

Commands are in [testing](testing.md) and [CI/CD](ci-cd.md). Main local evidence remains under `/tmp/sensel-base-audit/`: `check-final.log`, `tests-final.log`, `python-final.log`, `dead-code-final.log`, `consumer-final-*.log`, `web-build-ui-final.log`, `final-container-smoke.log`, `final-container-images.json`. Temporary secrets, browser traces and databases are not versioned.

The production Compose smoke containers/network/volume were removed; other verification services were stopped before that handoff. Local images/logs remained for reproduction. No push, GHCR publication or remote deployment occurred. Deferred original-product capabilities are listed in the [extraction inventory](extraction-inventory.md); passing test counts do not imply every legacy feature was moved.

## UI Restoration and Cross-Review: 2026-09-28

At the user's request, three agents separately handled login/shell, Chat and browser verification; the lead agent integrated settings pages and cross-reviewed them. Source repositories remained read-only, retaining the new CoreStore, Prisma and independent Agent boundaries.

Restored the original split login, logo proportions, Geist, original tokens, floating sidebar, Chat layout, model catalog and account-edit dialogs. Removed the simplified layouts and Chat styles embedded in UI, splitting style ownership by responsibility. Production modules stayed within 400 lines. Necessary functional differences are in [DESIGN](../DESIGN.md).

Cross-review also disabled edits until both user/group data loaded, preventing accidental membership clearing; distinguished successful saves from refresh failures; cleared default models when execution settings changed; and prevented unknown tool results from showing success. Model forms defaulted to a real provider with an empty model ID; fake still required explicit selection and environment permission.

- Static checks: lint, TypeScript, architecture, Knip and documentation passed; backend/Prisma/SSE tests: 10 passed, 0 skipped.
- All 11 production-build browser tests passed in 14.2 seconds: login geometry/keyboard, settings saves, model connection/tools, Chat reload, cancellation/disconnection/unknown states, authorization and group-load failure protection.
- Production Web build passed; final browser build ID `a1SCoKs3GNQdxiZatHQwn`.
- Independent customer `/tmp/sensel-base-consumer-visual`: 3 tgz installs, Prisma generation, typecheck and production build passed, including CSS, Geist and public assets. This preceded the final one-line logo aspect-ratio correction; final styling was separately validated through Web/container builds.
- Visually compared original public login and restored 1440/390 screenshots; inspected new Chat/settings/dark screens. No authenticated customer pages were captured, and full pixel equivalence is not claimed.
- New Web image `sensel-base-web:visual`: `sha256:090ad0c29ac78c99ad2a6b9a654020faea251449732ae5c85a63c0ff391cace2`. Python/schema/migrations were unchanged, so Python tests were not rerun in this round.

Logs and synthetic captures are under `/tmp/sensel-base-visual/`; secrets, traces and these verification captures were not committed.

The local preview at `http://localhost:3300` was updated to the new Web image. Web/Agent/PostgreSQL were healthy; existing administrator login succeeded, one model and one conversation remained, and browser pageerror count was zero. Only Web was rebuilt; the database was not reset and other projects were not stopped. Isolated verification services were stopped, while preview 3300 stayed running. No push or remote release occurred.

## Shared Analytics, Reports and Settings: 2026-09-28

Three agents handled Analytics, Reports and backend persistence; the lead integrated navigation/shared settings and cross-reviewed. See [shared capabilities](analytics-and-reports.md).

- `npm run check`: lint, root/Web types, dependency boundaries and 400-line module checks passed.
- `npm run dead-code`: no unresolved findings. CI installs poppler-utils; only its documented non-npm `pdftotext` binary is exempted.
- `npm test`: 22 passed, 0 failed, 0 skipped, covering real Prisma persistence, concurrent settings version conflicts, owner isolation, source failure, chart ranges and exports.
- The actual PDF renderer generated 12 Chinese pages. Poppler confirmed Chinese text, the last saved record, complete long narrative and every footer; cover/detail images were visually inspected.
- Production Next build and all 14 browser tests passed in 20.3 seconds, including actual JSON/CSV/PDF downloads, saved downloads with offline sources, unchanged old-report time zones, settings reload and mobile layout.
- Five npm packages were packed and installed into `/tmp/sensel-base-consumer-features`; Prisma generation, typecheck and production build passed. Chinese font/license and public assets were included without original workspace code dependencies.
- Seven synthetic captures of overview/report/settings at 1440/390 plus dark overview were inspected. No page-level horizontal overflow; mobile tables scrolled inside their containers.

Two migrations applied in sequence to an empty isolated database and bootstrap passed. Python runtime/Agent image were unchanged, retaining prior evidence; the real Agent participated in all existing Chat browser regressions. CI gained the PDF text-check system dependency; corresponding local steps ran, but GitHub execution had not occurred.

Logs/captures are under `/tmp/sensel-base-features/`; PDF/text/image evidence is at `/tmp/sensel-base-visual/reports-cjk-long.pdf` and adjacent images. These verification data/artifacts were not versioned.

Container and retained-data upgrades also completed:

- Final local browser build ID: `PeUKrjHpMPD7WPoNy2A4M`.
- Web `sensel-base-web:features`: `sha256:9d3abf797e357ef312805fa1b50f765f366fba0aaabf512f5e90cd8c0488b26d`.
- Migration `sensel-base-migrate:features`: `sha256:0dc3c6b9b8cb03ffcfaf80b9a978ab14b0bca4b52699824a9ac97dbe14053e82`.
- Backed up the preview database to a private temporary file, then applied only `202609280002_feature_modules`. No reset/rebootstrap; one model, one conversation and existing administrator login were preserved.
- Preview Web/Agent/PostgreSQL at localhost:3300 were healthy. Opened overview, saved an explicitly synthetic “SenseL 共用功能示範報告”, downloaded an actual 131464-byte PDF and verified the stored snapshot; browser pageerror count was zero.
- Stopped isolated Web/Agent/PostgreSQL, leaving preview 3300 running. No push, registry publication or remote deployment.

## Mail Extension: 2026-09-29

This round added the sixth npm package `@sensel/mail`, administrator UI/API and a third database migration. Earlier counts, five-package consumers and image digests apply only to their recorded versions. Mail checks used only synthetic/mocked HTTP, not real Resend credentials, sender-domain validation or inbox delivery. See [mail service](mail-service.md).

Final verification in this round:

- `npm test`: all 30 passed, including real PostgreSQL version conflicts, encryption/masking, concurrent deduplication, unknown-result retention and pre-send authorization/enable checks. No actual email was sent.
- `npm run check`, `npm run dead-code`, `npm run docs:check` passed; new modules stayed within 400 lines.
- Mail screenshots at desktop 1440/mobile 390 were inspected; settings, tests and receipts retained the source's three-section layout.
- Six tgz files passed the actual generator, independent install, Prisma generation, typecheck and production Next build.
- Local images `sensel-base-web:mail` and `sensel-base-migrate:mail` built successfully. Preview data was backed up before the additive mail migration, with no database recreation/bootstrap. Preserved one user, one model, two conversations and one report.
- Actual login and mail settings page at localhost:3300 passed with zero pageerrors; mail remained disabled without a key. All three preview services were healthy; unrelated services were unchanged.

Evidence is under `/tmp/sensel-base-mail/`. Actual Resend delivery, remote GitHub Actions execution and SMTP were outside scope.

- Final full browser regression: 18/18 passed in 23.9 seconds, including four mail cases and the prior 14 UI/report/conversation cases.
- The generator preserved dependency overrides. Regenerated consumer-secure passed Prisma/types/production build and npm audit reported zero findings. This fixed loss of the existing PostCSS 8.5.26 override in new projects.
- Isolated Web/Agent/PostgreSQL stopped and their test volume was removed. Preview 3300 stayed running. No push or remote release.

## Documentation, Code and CI/CD Review: 2026-09-29

After mail commit `441ec24`, three agents reviewed documentation, backend/Python and CI/CD, with lead cross-review/integration. Added the [self-review guide](self-review.md) for manual acceptance and code reading.

Fixes:

- Corrected stale package counts, Agent working directory/environment loading, isolated test order and Compose/image-mode descriptions; linked self-review from README/index.
- Aligned Python fake mode with Web: only explicit development/test environments. Fake mail no longer decrypts an unused retained Resend key.
- When a completed historical reply exceeds Agent's per-message limit, Web returns HISTORY_TOO_LARGE before inserting a new message or dispatching, preserves the original content and suggests a new conversation. This is explicit limit handling, not long-context summarization or unlimited continuation.
- The sample tool now names its bounded, at-most-100 count recentConversationCount and returns historyLimit instead of implying a total.
- Mail name-length/required fields match backend validation.
- CI verifies six consumer tgz archives, actual installation paths, versions and dependency overrides, and uploads available Web/Agent logs. Release validation covers template/internal dependencies and explicitly uses Python 3.12.

Executed checks:

- npm backend/core: 31/31 passed with isolated PostgreSQL and no skips; Python 27/27 and Ruff passed.
- npm check, dead-code and 39-document links/fences passed; npm audit reported zero findings at that time.
- Production Next build and full browser 18/18 passed in 25.4 seconds with isolated PostgreSQL/Web3210/Agent8211, without live provider calls or mail.
- Six-package consumer guard passed; a missing-overrides case was rejected. Positive/negative release-version checks, YAML structure, script syntax and Compose config --quiet passed.

Limits: actionlint was not available, and this round did not establish remote GitHub Actions, GHCR publication or production deployment. Preview 3300 was not rebuilt in this round and retained the previously verified mail image. Fixes were verified in a local production build and isolated services; existing preview/customer data was unchanged. Lead logs are under `/tmp/sensel-base-review/`; temporary files are not repository deliverables.


## Shared Frontend Design, Portable Skills and English Documentation (2026-09-29)

The user requested consistent page boundaries, Digiwin-sized time controls, unified typography and less redundant helper copy. Overview, reports and eight inspected page variants now use one `.sensel-page` frame: maximum width 1280px including padding, centered, with 24px desktop and 16px mobile gutters. Login and full-height Chat retain their own layouts. The range popover follows the inspected Digiwin TimeRangePicker dimensions: up to 512px, 36px inputs and responsive preset/date columns.

DESIGN.md records the shared contract. Two canonical skills, `sensel-frontend` and `sensel-ui-review`, are discovered through relative `.agents/skills` and `.claude/skills` links. The generator includes these skills, DESIGN.md and CLAUDE.md in independent customer projects. All documentation prose is now English; product UI and quoted UI labels remain Traditional Chinese.

Executed checks:

- `npm run check`, `npm run dead-code`, 45-document link/fence checks and local heading-link validation passed.
- The production Next build and full browser suite passed: 20/20 in 28.0 seconds, including 1920px/390px geometry across overview, reports, platform, mail, models, users, groups and profile.
- The two layout tests were then extended and rerun: 2/2 passed, verifying filter width/containment, 36px inputs, keyboard opening/closing, focus return and invalid-range feedback. Desktop/mobile screenshots were inspected; preview 1440px overview/settings bounds also matched.
- Both skill structures passed the skill-creator validator. An independent agent reviewed their behavior for a new Nginx page and preservation of necessary synthetic/partial/unknown labels; the review scope was clarified for isolated page changes. This is not a claim of end-to-end execution in both Codex and Claude Code.
- Six tgz packages were generated and installed into a new customer project. Prisma generation, typecheck and production build passed. Moving the whole project to `/tmp/sensel-base-design/relocated/consumer` preserved package resolution and all four skill discovery links inside the customer directory. The consumer guard now also checks local skill discovery and design entry files.
- Web image `sensel-base-web:design` built successfully: `sha256:f55d82d4a2e6c9e69460a2096c8648a07f8400703d80e6bd9cc95ba6ba00a1b8`. Only the local preview Web container was recreated; no schema migration was needed. Preview Web/Agent/PostgreSQL are healthy, login/navigation succeeded without browser page errors, and user/model/chat/report counts remained 1/1/2/1.

Logs and synthetic screenshots are under `/tmp/sensel-base-design/`. Isolated test Web/Agent/PostgreSQL were stopped; preview 3300 remains available. No real mail or paid provider calls were made. Remote GitHub workflow results and published releases are not established by these local checks.


## Event Table Examples and Group Semantics (2026-09-29)

Recent events now support combined search/category/level filters and sortable time/title/category/level columns. Filtering and ordering precede pagination; source arrays and saved snapshots remain unchanged. IDs provide stable tie-breaking, and level sorting uses label order without an invented severity policy. Two distribution cards share a desktop row and stack on mobile: provider category aggregates and explicitly scoped returned-event levels.

The English analytics guide includes data and component examples. The new groups-and-permissions guide documents actual membership management, separate ADMIN/USER and owner checks, and the customer AnalysisProvider extension point. No group permission policy or authorization behavior was added in this UI change.

Validation: production Next and Web image builds passed; npm check/dead-code/document checks passed. The backend/core/analytics suite passed 34/34 with isolated PostgreSQL and no skips. The complete browser suite passed 22/22 in 30.7 seconds; the final two event tests were rerun after adding explicit card-geometry and chart-to-table filter assertions, and both passed. Desktop/mobile screenshots were reviewed. No provider calls or real mail were used.

Preview 3300 was updated to `sensel-base-web:events`. Login, local level filtering and header sorting passed with zero page errors; Web/Agent/PostgreSQL are healthy. Only Web was recreated, with no schema changes, and existing user/model/chat/report counts were preserved. Logs and synthetic captures are under `/tmp/sensel-base-events/`. Isolated services were stopped after validation; the preview remains running.


## Platform Evolution: 2026-09-30

Implemented the [evolution plan](base-evolution.md) with the actual exports and extension boundaries documented in the [reuse guide](reuse-guide.md). Source Nginx files were read-only; shared changes retain customer-owned queries, authorization, prompts and schemas.

Executed against the final implementation:

- npm check (lint/types/boundaries/module size), Knip and documentation links/fences passed.
- Backend/core contracts: **38 passed, 0 skipped**, using a fresh isolated PostgreSQL 18.6 database with all three migrations and administrator bootstrap.
- Python 3.12.11: Ruff passed; **32 tests passed**, including signed deadlines, trusted time context, partial-result handling and Gemini schema conversion.
- Production Next build passed. Full Playwright suite: **28 passed in 54.5 seconds**, including existing regression cases, routed raw-event/entity browsing at 1440/1920/390px, paging/search/sort and URL restoration, chapter editing/preview/PDF, mocked quota and initially closed tool history.
- Actual PDF export was checked using pdftotext and pdftoppm; edited Chinese text, order/omissions, metrics and graphic trend were inspected. Preview does not insert a report; saved exports use stored snapshots. Legacy snapshots remain supported.
- Six npm tgz packages were generated and installed into /tmp/sensel-ready-consumer. Consumer guard, Prisma generation, typecheck and production build passed. The independent server on port 3250 returned healthy database readiness and HTTP 200 for /overview.
- Python wheel installed into a fresh /tmp/sensel-evolution-wheel environment. The generated consumer Agent ran the installed wheel on port 8250 without source PYTHONPATH, and its /ready endpoint returned ok/runtime v1.
- Both canonical frontend skills passed structure validation; the generated consumer includes the reuse guide and local skill discovery links.
- Current synthetic screenshots were visually inspected and copied into [documentation images](images/README.md), including light/dark table states and actual PDF output.

Browser verification used dedicated Web 3249/Agent 8249 and PostgreSQL 55439, with explicit fake gates and synthetic data. Local evidence includes /tmp/sensel-evolution-tests.log, /tmp/sensel-evolution-all-ui.log and /tmp/sensel-ready-consumer-build.log; test-results contains temporary browser/PDF artifacts and is not committed.

Limits: quota transport is implemented for TokenFleet only and tested with mocked HTTP, not a real account; this is not per-run token/cost accounting. Customer AnalysisProvider/ExplorationProvider integrations and arbitrary report chart schemas require project-specific adapters. No live model, real email, new container build, registry publication or deployment was performed in this round. Earlier container/preview evidence applies only to its recorded version. Local results do not establish a remote GitHub Actions result.
