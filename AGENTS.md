# Working on SenseL Base Platform

This repo contains reusable application and Agent capabilities for independent customer projects. Read README.md, docs/architecture.md and docs/code-organization.md first. Read DESIGN.md for UI work, docs/data-storage.md for persistence, and docs/agent-runtime.md for runtime changes.

## Boundaries

- `packages/` owns TypeScript core; `python/` owns the installable Agent runtime.
- `templates/project/` owns thin example composition, concrete Prisma adapter and customer extension points.
- Core never imports a customer repo, its `@/` alias, Prisma generated client, SOC models or mandatory Elasticsearch.
- Prisma/PostgreSQL is the default template storage. Elasticsearch is optional, never a core startup requirement.
- Analytics/report UI consumes shared DTOs; customer AnalysisProvider owns queries and authorization scopes. Reports persist snapshots once and render/export saved data, even when the live provider is unavailable. Never treat synthetic, partial or unknown data as a complete customer result.
- Mail uses @sensel/mail for transport and @sensel/server for durable reservations and authorization. Never treat accepted as delivered or automatically resend unknown results. Fake mail requires its own explicit non-production gate; customer notification triggers and recipients remain customer-owned.
- Customer tools, prompts, scopes, pages and schemas belong in customer repos. Future PCAP integrations follow the same rule.
- Source Digiwin repos are read-only during extraction; another agent may be working there. Do not change existing services, environments or data.
- The user authorized CI/CD configuration after core verification. Implement and validate workflows; do not push, publish or deploy remotely without an explicit request.

## Workflow

During extraction, preserve the source UI layout and interaction hierarchy. Read DESIGN.md and compare actual screenshots; separating dependencies does not authorize redesigning login, navigation or chat. Keep style ownership in the relevant package, remove obsolete rules rather than stacking overrides, and document necessary contract differences.

Use Node >=20.19 and Python >=3.12. Install with `npm ci`, then generate the Prisma client. Use root package scripts instead of undocumented paths. `npm run check` checks lint, types and boundaries. `npm test` exercises backend contracts. `npm run test:ui` requires the isolated running stack; see docs/testing.md. Python commands live in python/README.md.

Use fake providers and isolated synthetic databases for testing. Do not call live model providers or send email in automated verification. Never print, copy or commit real secrets, customer logs, database exports or `.env` files.

Keep production modules below 400 lines and give them one responsibility. Avoid generic utility buckets, copied implementations, unused abstractions and broad lint suppressions. Dead-code tools report candidates; verify framework routes, tool registrations, scripts and runtime consumers before deletion.

Update the extraction inventory and applicable documents with behavior changes. Do not claim a provider, package install, browser path, migration or deployment is verified without executing the corresponding check. Record unresolved limitations explicitly. Commit only coherent verified work; no push or production promotion unless requested.
