# Data Storage and Prisma

Prisma is the ORM; PostgreSQL is the database. Each customer owns a schema, generated client and migration sequence. The platform server depends only on CoreStore; concrete adapters live in template `web/src/server/prisma-store.ts` and related files.

Core contracts include User, Group, Session, ModelConnection, Chat, ChatMessage and AuditEvent. ChatMessage stores content, execution ID, state and redacted tool traces. Sessions store hashed tokens, not plaintext cookies. ModelConnection keys use AES-256-GCM and never return through read APIs as plaintext.

Groups are identity-management primitives, not assumed SOC vendor/site scopes. Customers must enforce resource authorization in business queries; hiding navigation is insufficient. The sample tool returns the current user's bounded recent conversation count (`recentConversationCount`, `historyLimit=100`), not a historical total.

Migrations do not run implicitly when importing a package or starting the application. Use `npm run db:migrate` or Compose's one-shot migration service. New core schema versions need migration instructions, customer integration and isolated-database verification.

Original Digiwin schemas and migrations were not copied. Never apply the new migrations over an old database as a replacement. Future integration requires explicit table mapping, historical reads, encryption compatibility and recovery testing.

Nginx logs may live in PostgreSQL. Projects needing Elasticsearch install adapters and own mappings/index lifecycles separately. PCAP files can use filesystem/object storage while the database holds indexes and results. The platform does not provide a generic SQL-to-Elasticsearch conversion layer.

## Shared Analytics and Reports

The template Prisma adapter owns `PlatformSettings`, `PlatformSettingsAudit` and `ReportSnapshot`. Their additive migration creates tables without resetting existing data. Reports store complete JSON snapshots with ownerId-based access; customer business events remain in customer schemas or services. Settings and before/after audit entries commit in one transaction. See [analytics and reports](analytics-and-reports.md).

## Mail Configuration and Delivery

Migration `202609290001_mail` adds `MailConfiguration`, `MailDelivery` and `MailSettingsAudit`. Credentials use the same AES-256-GCM interface. Settings and redacted before/after audit entries commit together; audit data includes only hasApiKey and secretChanged, not secrets. Administrator transactions use a shared PostgreSQL advisory transaction lock to serialize authorization, version checks and deduplication reservations.

Mail reserves an unknown record with a database-unique UUID idempotencyKey before external HTTP. Replaying the same actor/content/configuration version returns the saved outcome without resending; conflicting actor/content returns 409. The ledger stores recipients, subject, version, content HMAC and provider receipt, but not the body. Unknown can mean in progress, interrupted, or receipt persistence failure. Never delete a receipt to trigger an automatic resend. The template uses one database per customer; shared multitenant schemas and automatic receipt cleanup are not included. See [mail service](mail-service.md).
