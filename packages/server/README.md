# @sensel/server

Reusable authentication, model management and chat application layer. It consumes
`CoreStore`, an explicit persistence interface; it never imports a generated Prisma
client, Next.js route, customer module or Elasticsearch package.

```ts
import { createCoreHandler } from '@sensel/server';
const handle = createCoreHandler({ store, encryptionKey, agentUrl, agentSecret,
  secureCookies: true, allowedModelEndpoints: [], allowFake: false, tools: [] });
```

The project template supplies the Prisma adapter and exports the handler as Next.js
GET/POST/PATCH/DELETE routes at `/api/core/[...path]`. `authorizeTool` validates service
bearer credentials, signed execution profiles, tool grants and current account status
for customer-owned HTTP tools. Secrets use the extracted `gcm1` AES-256-GCM format.

Management APIs use database transactions, fresh admin checks and optimistic versions.
A default model requires connection and tool checks at its current configuration
version. API keys never appear in management responses. All provider calls happen
through the Python Agent; no provider is contacted by the TypeScript test suite.

Run `npm test` for unit tests. Set `CORE_TEST_DATABASE_URL` to a dedicated localhost
PostgreSQL database whose name ends in `_audit` to run persistence integration tests.
Tests write synthetic users, groups, chats and model settings; discard the test database
after validation. Never use a customer database.

Limitations: cancellation and login throttles are process-local (single Web instance).
Account/group/model lists are bounded; cursor pagination and settings operation replay
from the source application are not yet extracted. Audit events record actor/action/target
transactionally but do not expose a history UI. There is no production-data migration
from the source application. See [extraction notes](EXTRACTION.md).

## Analysis, snapshots and platform settings

`CoreConfig.analysisProvider` is a customer-injected boundary. `sources(actor)` advertises
only authorized source IDs; `collect({actor,query})` supplies `OverviewData` from
`@sensel/analytics/contracts`. Requests use UTC instants with inclusive `from`, exclusive
`to`, and a positive range of at most 90 days. Missing source ID selects the first advertised
source; the core does not invent an `all` source. Missing/failing providers return 503,
never an empty success. Provider output is validated for query/range consistency, category
IDs, distinct identifiers, count bounds and a 5 MiB serialized snapshot limit.

Reports use `@sensel/reports/contracts`. Creation calls `collect` once and stores the
snapshot JSON in PostgreSQL. Listing, reading and exports use that saved JSON; they do
not query the provider again. Access is owner-scoped, including administrators. Listing
supports title query, page and pageSize (1–100). There is no update-snapshot API.

Authenticated users may read safe platform settings. Admin writes require an expected
version and run under the same transaction-scoped advisory lock as identity/model
settings; before/after values are saved atomically. Admin audit reads expose up to 50
rows and a nextCursor. Settings are name, IANA display timezone, report title and default
range days (1–90), not mail credentials. Query instants remain UTC regardless of display
timezone. Report snapshots freeze the display timezone at creation.

## Mail configuration and durable delivery

`GET/PATCH /api/core/mail/settings`, `POST /api/core/mail/test` and
`GET /api/core/mail/deliveries` require a freshly active administrator. Settings expose
`hasApiKey`, never plaintext, partial key text or ciphertext. Blank API-key input retains
the stored encrypted key. Configuration updates require `expectedVersion` and save a
redacted before/after audit row in the same transaction. MailSettingsAudit is storage-only;
there is no audit browsing endpoint in this module yet.

`sendConfiguredMail(config, actorId, message)` is the customer-server entry point. It
consumes pure `@sensel/mail/contracts` and the bounded runtime transport; it requires an
active admin actor, a UUID idempotency key and an expected configuration version. It
stores a globally unique key with a keyed content fingerprint. Reusing a key for different
content or a different actor fails with 409. A reservation is committed before transport
I/O; a second caller never dispatches the same key again. Current configuration and
actor authorization are checked again immediately before dispatch, outside the reservation
transaction. No network request is held inside a database transaction.

Receipts distinguish `accepted`, `rejected`, `unknown` and `cancelled`. Provider acceptance
is not confirmed mailbox delivery. Reservations start as `unknown` with
`IN_PROGRESS_OR_INTERRUPTED`; if the process stops, they remain conservatively unknown.
A response-persistence failure also returns unknown. Unknown outcomes are never automatically
resent, including after restart. Settings changes do not recall an already dispatched email.

The template enables the fake transport only with **both** `MAIL_ALLOW_FAKE=true` and
`APP_ENV=test|development`. This is independent of Agent fake mode. The controlled test
endpoint accepts one recipient; the generic server service accepts up to ten, with bounded
subject/body lengths. Delivery history is admin-only and paginated (maximum 100 per page).
Tests use synthetic addresses plus injected/fake transports and do not contact a mail provider.
