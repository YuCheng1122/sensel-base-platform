# API Contract

The Web template mounts `/api/core/[...path]` and uses an HttpOnly session cookie. Mutations validate PUBLIC_APP_URL/Origin and reject cross-origin requests. Errors use `{error:{code,message}}` without exposing internal exceptions or secrets.

| Path under /api/core | Method | Behavior |
| --- | --- | --- |
| auth/login, auth/logout | POST | Create/revoke a session |
| auth/me | GET, PATCH | Current user, profile/password changes |
| users, groups | GET, POST, PATCH | Administrator operations; updates use expectedVersion |
| models | GET, POST, PATCH | Users read enabled models; administrators save settings |
| models/:id/test | POST | mode=connection or tools; save checks for the current version |
| chats | GET, POST | List/create the current user's conversations |
| chats/:id | GET, DELETE | Read/delete an owned conversation |
| chats/:id/messages | POST | content and optional modelId; returns SSE |
| chats/:id/cancel | POST | Cancel executionId after checking ownership |

`/api/health` checks Web storage, not Agent/model availability. `/api/agent/tools/project-info` is a template tool endpoint, not a general data API.

Agent uses service Bearer authentication and execution-bound profiles. Web→Agent uses NDJSON; Web→browser uses SSE. The authoritative field/event definitions are [runtime-v1](../contracts/runtime-v1.md), not a duplicated contract.

Platform v1 is not a compatible upgrade to Digiwin's `/api/agent/v1`. Consumers must adopt the new contract or maintain a compatibility adapter.

## Overview, Reports and Platform Settings

| Endpoint under /api/core | Behavior |
| --- | --- |
| GET `/overview/sources` | Sources available to the current user |
| GET `/overview?from=…&to=…&sourceId=…` | Generic aggregation with coverage labels, maximum 90 days |
| GET/POST `/reports` | Owned reports (query/page/pageSize) / collect and save a snapshot |
| GET/DELETE `/reports/:id` | Read/delete an owned saved snapshot |
| GET/PATCH `/settings` | Safe shared settings / administrator update with expectedVersion |
| GET `/settings/audit?cursor=…` | Administrator audit history, 50 entries per page |

Contracts live in `@sensel/analytics/contracts` and `@sensel/reports/contracts`. Query dates are UTC instants with inclusive start/exclusive end; reports save an IANA display time zone. Missing/offline sources return 503, not fabricated empty data. Saved report reads do not depend on live sources. All writes require authentication and same-origin checks; ownership is enforced server-side. See [customer integration](analytics-and-reports.md).

## Mail Service: Administrators Only

| Endpoint under /api/core | Behavior |
| --- | --- |
| GET `/mail/settings` | `{item}`: provider, enabled, fromName, fromEmail, version, hasApiKey, allowedProviders; no secrets |
| PATCH `/mail/settings` | Save provider/enabled/fromName/fromEmail/expectedVersion and optional apiKey; stale version returns 409; blank key preserves it |
| POST `/mail/test` | `{to,expectedVersion,idempotencyKey}`; UUID key and one recipient; server-owned subject/body; returns `{item,replayed}` |
| GET `/mail/deliveries?page=1&pageSize=20` | `{items,total,page,pageSize}`; project delivery history for administrators; maximum pageSize 100 |

DTOs live in `@sensel/mail/contracts`. Ordinary users have no arbitrary-send API. Accepted means provider acceptance, not delivery; unknown results are not resent automatically. Writes use same-origin/session checks, and storage rechecks disabled accounts/role changes. Customer server code may call `sendConfiguredMail` from `@sensel/server`; the template still requires an administrator actor. See [mail service](mail-service.md).

Before dispatch, conversation POST checks the latest 40 completed history entries. Any entry exceeding 32000 JavaScript string units (UTF-16) produces HTTP 400 `HISTORY_TOO_LARGE` with guidance to start a new conversation. It neither inserts the new message nor calls Agent; previously saved content remains complete instead of silently truncating long replies.
