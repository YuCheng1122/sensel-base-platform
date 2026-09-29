# Groups and Permissions

[Documentation](README.md) · [Project home](../README.md)

Groups currently organize users and provide membership information to customer integrations. Creating a group does **not** automatically grant access to models, analysis sources, conversations, reports or Agent tools. The built-in role checks and ownership rules are separate from group membership.

## What Is Implemented

An administrator can list, create and edit groups under group management, and assign or remove memberships when editing a user. A user may belong to multiple groups, and a group may contain multiple users. Groups have an ID, unique name, description and version. Updates use expectedVersion to reject stale edits. The current API supports GET/POST/PATCH for groups; it does not implement group deletion, nesting or per-group permission editing.

Membership is stored through the Prisma User–Group many-to-many relation. The user response includes `groupIds`; session lookups load the current user and memberships from the database rather than retaining a permanent permission snapshot in the cookie. Changing memberships does not itself change the user's ADMIN/USER role.

## Rules Applied Today

| Area | Current rule | Effect of group membership |
| --- | --- | --- |
| User/group administration | Active ADMIN role required; persistence rechecks authorization | None; a group named “Administrators” grants no ADMIN role |
| Model settings | Administrators manage/test models; ordinary users can list enabled models | No model-to-group assignment or group-specific model policy |
| Platform settings and mail administration | Administrator-only writes/administration as documented by each API | No group-based grants |
| Conversations | Access is restricted by the owning userId | Joining the same group does not share conversations |
| Saved reports | List/read/delete/download are restricted by ownerId | Joining a group does not share saved reports; ADMIN alone does not bypass ownership |
| Event sources and collection | Core passes AnalysisActor to the injected AnalysisProvider; the customer provider owns data authorization | groupIds are available to implement customer policy, but no generic group/source mapping exists |
| Agent tools | Signed execution/tool allowlist plus current user validation; tool backend owns business authorization | No built-in group-to-tool policy; customer handlers may use the returned user's memberships |

The default synthetic analysis provider intentionally returns the same synthetic sources to authenticated users. It does not apply a group policy. Creating “Operations” and “Security” groups therefore does not make the demo show different datasets.

## Customer Example: Nginx Source Access

A customer might want an Operations group to see application access logs and a Security group to see security-monitoring logs. That is a possible integration, **not an active feature in this template**.

The customer would:

1. Define which stable group IDs are allowed to access each customer-owned log source. Do not rely on mutable display names as permission identifiers.
2. Implement `AnalysisProvider.sources(actor)` to return only permitted sources using actor.id, actor.role and actor.groupIds.
3. Enforce the same policy inside `collect({actor, query})` and its database queries, including a missing sourceId or any “all sources” option. Filtering the dropdown alone is insufficient.
4. Apply equivalent checks to custom log APIs and Agent tool backends. Core's signed tool allowlist does not authorize every resource a tool could query.
5. Test permitted and denied requests, users with no groups, multiple memberships, membership removal and direct requests that bypass UI controls.

Customers decide whether multiple groups combine access, whether explicit denials override grants, and whether administrators have any business-data override. The platform does not silently choose those semantics.

Saved reports remain immutable, owner-scoped snapshots. Removing source access does not currently revoke access to a report that the same user already owns. If customer policy requires such revocation, design it explicitly alongside report retention/export rules; do not assume a new source policy changes saved-snapshot access automatically.

## Not Yet Included

There is no permission matrix, resource-grant editor, model/source/tool binding UI, group-shared report/conversation workflow, hierarchical group inheritance, or shared-deployment tenant isolation. Membership administration is a reusable foundation for these features, not evidence that they already exist.

## Implementation References

- [Prisma schema](../templates/project/web/prisma/schema.prisma): User/Group relation and role fields.
- [Core handler](../packages/server/src/handler.ts): group endpoints and model/administrator rules.
- [Prisma store](../templates/project/web/src/server/prisma-store.ts): membership updates, session reads and conversation ownership.
- [Analysis contracts](../packages/server/src/feature-types.ts) and [feature handler](../packages/server/src/feature-handler.ts): AnalysisActor and provider boundary.
- [Report store](../templates/project/web/src/server/prisma-feature-store.ts): owner-scoped saved snapshots.
- [Tool authorization](../packages/server/src/tool-auth.ts): signed execution checks and current user lookup.

See [API contracts](api-contract.md), [storage](data-storage.md) and [analytics integration](analytics-and-reports.md) for related behavior.
