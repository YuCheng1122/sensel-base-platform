# Extraction and Cleanup Inventory

Sources: workspace repositories `sensel-full-stack` and `sensel-agent`. Their source HEADs were `c206fd1b2cd2c2ca29faae0811b94d1741d276da` and `8149b847fa28b6ff93346079a85cd1a9a3df7763`. Both contained uncommitted work, so HEAD alone cannot reproduce the inputs; package inventories preserve hashes of files actually read.

| Capability | Destination | Treatment and verification boundary |
| --- | --- | --- |
| UI tokens/forms/administration layout | @sensel/ui | Preserve login, floating sidebar and administration hierarchy; split styles by responsibility; exclude unused shadcn/SOC components |
| Chat/tool traces | @sensel/chat | Restore sidebar, welcome, messages/composer and tool panel; retain history/SSE/cancellation; no raw HTML in Markdown or security-event coupling |
| Charts/event overview | @sensel/analytics | Source hierarchy, time/source filters, metrics/trends/categories/events; injected customer provider and explicit coverage |
| Reports/PDF/CSV/JSON | @sensel/reports + server | Immutable snapshots, owner authorization, previews/exports, CJK font, long-text pagination and vector categories; no SOC report schema |
| Mail configuration/runtime | @sensel/mail + ui + server + Prisma adapter | Fixed Resend endpoint, encrypted settings, admin tests, versions and durable deduplication; accepted is not delivered; unknown never auto-retries; no SMTP/queue/webhook |
| Platform settings/audit | ui + server + Prisma adapter | Name, time zone, report defaults, conflicts and transactional before/after; not all legacy settings operations or audit screens |
| Authentication/users/groups | @sensel/server + Prisma adapter | Recompose through CoreStore and opaque DB sessions; no NextAuth provider or Digiwin ACL fields |
| Secret encryption | @sensel/server/secrets | Preserve gcm1 AES-GCM envelope; no real data migration or claim of direct legacy DB compatibility |
| Model management | server + Python | Basic text/tools, version-bound connection/capability checks and default-model gates; no legacy catalog audit UI |
| Agent execution | sensel-agent-core | Selectively reimplement short-lived profiles, isolated providers, limits/cancellation/states; new HTTP protocol, not wire-compatible with original Agent |
| Trace redaction | Python trace.py | Extract domain-neutral redaction; remove SOC event-reference collection |
| Storage/migrations | Customer template | New core schema and initial migration; no customer history, source indices or customer fixtures |
| Engineering/deployment | Root scripts/deploy/workflows | Reorganized for independent repo; minimal Compose without ES/Redis; independent package consumer validation |

Detailed provenance: [UI](../packages/ui/extraction-manifest.json), [Chat](../packages/chat/extraction-manifest.json), [Analytics](../packages/analytics/extraction-manifest.json), [Reports](../packages/reports/extraction-manifest.json), [Mail](../packages/mail/EXTRACTION.md), [Server](../packages/server/EXTRACTION.md), [Python](../python/README.md).

## Retained in the Original Project or Deferred

SOC adapters, Elasticsearch mappings, event/host analysis, IoC/MITRE, false-positive/noise reduction, cases, SOC report content, customer sites and original prompts remain in Digiwin. Source files were not deleted or changed during extraction, and those repositories do not yet consume the new packages.

Notification subscriptions/scheduling, ingestion scheduling, settings operation replay, full account/model audit UI, distributed cancellation, durable jobs and legacy data migration are not completed first-release capabilities. They require new-contract extraction and verification; a similarly named source feature does not establish platform support.

## Cleanup

Core has no generated Prisma client, Elasticsearch, BullMQ/Redis, SOC graph or customer source-path dependencies. Python does not carry LangChain/LangGraph/LiteLLM, asyncpg, Tavily, OpenCC or tiktoken. Lightweight provider adapters promise only the documented scope.

Knip candidates were addressed: removed the unused direct react-dom type dependency, enabled the actual Next lint configuration, and declared bcrypt/Prisma used by bootstrap/tests. Public entry points are defined by package exports. Broad ignores were not used to conceal findings.

Thin adapters remain where required by entry points, service boundaries and packaging. Different responsibilities were not merged into a generic utility bucket. Source code was not copied wholesale, so customer secrets/data and historical builds were not imported. Exact check results belong in the verification record.


## Nginx-derived second-pass review

The [shared capability evolution plan](base-evolution.md) records the 2026-09-30 read-only source comparison and user-required defaults: editable sectioned graphic/text reports, model usage/quota, composed overview, raw-event and entity detail, pagination, addressable routes and per-answer tool history. At the initial review these were candidates, not completed capabilities: the source quota adapter was TokenFleet-specific, source detail covered domain/IP, and browser/PDF report content needed reconciliation. The implementation and verification below supersede that initial status.


The second pass now includes shared chapter editing/resolution/PDF, draft preview, controlled tables, raw-record rendering, exploration contracts, routed synthetic host/domain/event composition, quota UI and a TokenFleet adapter, per-answer traces, chat management and signed deadlines/time context. See [actual exports and integration recipes](reuse-guide.md). Customer source remained read-only; CDN queries, field registries, domain prompts and notification triggers were not imported. Browser-discovered auto-opening of tool panels was removed to honor the user's explicit default. Legacy report snapshots remain supported without a database migration.

Second-pass source file hashes are recorded in [the Nginx extraction manifest](nginx-extraction-manifest.json).
