# Backend extraction record

Source working tree: `sensel-full-stack`; HEAD `c206fd1b2cd2c2ca29faae0811b94d1741d276da`. The source had uncommitted changes; the hashes below identify the actual read files, not a claimed clean commit snapshot. No source files were edited.

| Source | SHA-256 | Disposition |
| --- | --- | --- |
| `src/server/auth/config.ts` | `77c9f34029413690462bf318b6877662b53eb120c00889e0821c4f688e23fc88` | Adapted bcrypt authentication; replaced customer redirects/JWT role cache with opaque DB sessions and fresh identity lookup. |
| `src/server/services/agent-api/model-configuration.ts` | `e7d56be61a8c68578c5973ba76700bd03dd0ad7aec0a8cd0c264ad108f1d8924` | Extracted/adapted gcm1 AES-256-GCM and endpoint validation; removed customer/provider catalog coupling. |
| `src/server/services/setting-mutation.ts` | `d3b15a4064572259c8f829a362f4c0fff64be31fb86f9a93889378775ad1aae8` | Adapted fresh-admin advisory lock, optimistic versions and transactional audit; operation replay/fingerprints deferred, not claimed preserved. |
| `src/server/api/routers/chat.ts` | `9a57acf3c8f16fba4b5601137a32d282d5cf9cde4217c90b203ebed740242648` | Reimplemented domain-neutral owner-scoped conversation persistence and NDJSON→SSE bridge; SOC case/event traces excluded. |
| `prisma/schema.prisma` | `e42bdcaf20683a40059e1b9ef9b6d7abd17b294621cb47503c3c26889f7c7d96` | New clean schema owns only identities/sessions/groups/models/chats/audit; no source migration history or SOC tables copied. |

## New boundaries and removed dependencies

- `src/types.ts`: storage contracts; the template owns Prisma and migrations.
- `src/secrets.ts`: source-compatible ciphertext primitive; no customer secret copied.
- `src/handler.ts`: HTTP validation/authentication/management routing.
- `src/agent-bridge.ts`: scoped profiles, bounded history, SSE, cancellation and durable terminal state.
- `src/tool-auth.ts`: fresh user lookup and signed per-execution tool grant.
- Template Prisma adapter: atomic account/group/model changes and redacted audit metadata.

The new package depends only on zod and bcryptjs plus Node built-ins. Source tRPC,
NextAuth provider redirects, customer aliases, ES client and SOC permissions are not
runtime dependencies. Services were adapted where coupling prevented direct extraction;
this is not a claim that the full source application was copied or that every prior
feature was migrated. Existing source APIs remain unchanged.

## Validation and deferred work

Real isolated PostgreSQL migration/bootstrap and integration checks cover role denial,
chat owner isolation, settings conflicts, default-model capability gating, secret masking,
session revocation, tool grants and stale-account denial. Unit tests cover authenticated
secret encryption and signed profiles. Browser/Agent integration results are recorded
by the root task's validation report.

Known limits: process-local cancellation and login throttle; bounded history/list reads;
no settings-operation replay/cancel protocol, complete user/model audit browsing, session maintenance
job or source-data migration yet. These require explicit follow-up, not silent claims
of feature parity. Existing source behavior stays available in the source application.

## Generic feature additions

Overview rendering contracts are owned by `@sensel/analytics/contracts`; report snapshot
contracts by `@sensel/reports/contracts`. The server imports those pure contracts instead
of re-declaring UI DTOs. The template provider is explicitly synthetic and replaceable;
no customer ES index or business event schema was extracted into core. Additive migration
`202609280002_feature_modules` creates ReportSnapshot, PlatformSettings and its audit table.
It never resets the database or copies source customer migrations.

Initial read-only mail/notification inventory (mail transport/configuration candidates were subsequently implemented in the section below):

| Source | Reusable candidate | Kept out of this delivery |
| --- | --- | --- |
| `src/server/services/mail-provider.ts` | Bounded provider adapter; sent/rejected/unknown/cancelled outcomes; provider receipt callback | Resend dependency and live delivery until there is an actual mail feature and tested configuration lifecycle |
| `src/server/services/mail-runtime.ts` | Injected configuration resolver; configuration-version mismatch cancels delivery | Default resolver bound to source settings service |
| `src/server/services/notification-delivery-status.service.ts` | Provider receipt-status mapping | Source Prisma deliveries, vendor scopes and permission service |
| `src/server/services/sync/sync-notification-policy.ts` | Bounded sender, unknown-outcome semantics and retry limits | Vendor/site authorization and legacy customer recipient policy |

No SMTP or domain-notification triggers were copied. The subsequent mail module below implements real transport/configuration boundaries with synthetic verification; provider acceptance is never labelled mailbox delivery. The source customer notification triggers stay in that project.

## Mail extraction follow-through (2026-09-29)

The bounded transport and typed outcomes now live in `@sensel/mail`; its own extraction
manifest identifies source files and retained transport behavior. `@sensel/server` owns
encrypted configuration, typed admin HTTP routes and durable send coordination. The
customer Prisma adapter owns MailConfiguration, MailDelivery and MailSettingsAudit,
created by additive migration `202609290001_mail`. No customer mail setting, API key,
recipient list or historical receipt was copied.

Existing `admin()` advisory transaction locking was reused for configuration writes and
reservations. The new generic store strips the encrypted key before constructing audit
JSON. Deliveries store recipient metadata, subject and a keyed fingerprint, not message
bodies or credentials. A single committed reservation prevents repeat transport calls
across concurrent requests and process restarts; ambiguous outcomes remain unknown.
The new controlled test route sends only its fixed subject/body; arbitrary mail is exposed
only as a trusted customer-server function with an authorized admin actor.

True PostgreSQL tests cover competing configuration versions, competing idempotency keys,
unknown outcomes, interrupted receipt persistence, client reconnection, configuration changes
before dispatch, authorization revocation, secret masking, fake-mode isolation and history
pagination. All transports in verification were synthetic or injected. Source sync/vendor/site
notification policy and account-email templates remain customer-owned and were not copied.
