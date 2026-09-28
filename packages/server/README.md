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
