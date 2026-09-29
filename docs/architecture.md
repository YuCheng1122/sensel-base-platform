# Architecture and Responsibilities

```text
Customer browser
  → Next.js routes (customer composition)
    → @sensel/server → CoreStore → customer Prisma adapter → PostgreSQL
    → Python Agent HTTP API → model provider
      → customer-registered tools → authorized backend API → customer storage
```

`@sensel/ui` provides administration components, `@sensel/chat` conversation components, `@sensel/analytics` overview/charts, and `@sensel/reports` snapshot preview/export. `@sensel/mail` provides server-only mail runtime/transports; `@sensel/server` coordinates encrypted settings and durable deduplication. Customers inject data through `AnalysisProvider`. Server imports only the pure analytics/report contracts, not browser charts or PDF rendering. Packages expose TypeScript source and Next uses `transpilePackages`; the entire Next application is not published as a library.

Core never imports customer modules, generated Prisma clients or `@/` aliases. The template owns routes, Prisma adapters, navigation, tools and deployment composition. HTTP/NDJSON contracts cross the Web/Agent boundary.

Prisma/PostgreSQL is the default. Nginx projects add their own tables and query services; Digiwin consumers may retain their own Elasticsearch indices. PCAP files, parsers and long-running jobs remain customer responsibilities. There is no durable job engine in this version.

`project_info` is a minimal sample: Agent calls the backend, which verifies the signed profile, execution, tool permissions and current account state. It returns a non-sensitive capability summary and `recentConversationCount`, limited to 100 records (`historyLimit:100`), not a total-history count. It is not simulated Nginx business data.

## Operational Limits

The current design uses one Web instance and one Agent instance. Cancellation registries and login throttling are process-local; multiple replicas need coordination. Model profiles expire within five minutes and carry explicit execution IDs. Provider settings are not switched through global environment variables per request.

Legacy Digiwin APIs, schemas and prompts are not automatically migrated. Initial adoption requires deliberate integration; never point an old database directly at the new service.
