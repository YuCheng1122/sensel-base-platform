# Customer Upgrades

1. Read release notes and core schema/API changes.
2. Update the six npm packages and Python wheel to a compatible release in a customer branch; update lockfiles.
3. Generated routes, adapters and entry files belong to the customer. Apply migration instructions without regenerating over customer code.
4. Apply migrations to an isolated database first; verify login, historical data, models, tools and customer queries.
5. Back up data and record previous package versions/image digests before following the customer's release process.

The first release is a new foundation, not an in-place Digiwin database upgrade. Integrating it into the original project requires replacing capabilities individually, retaining necessary API compatibility adapters, and verifying behavior before removing duplicate implementations.

Fix shared core once and publish a new version. Customers choose when to adopt it rather than maintaining copied package source.

The mail extension requires `@sensel/mail`, the MailStore adapter and migration `202609290001_mail`; installing packages does not update customer schemas automatically. Preserve `SETTINGS_ENCRYPTION_KEY` and the delivery ledger so existing secrets remain readable and operations are not resent. Verify same-key replay, version conflicts, disabled state, authorization and unknown outcomes before enabling a real provider. Automated key rotation and legacy mail-data migration are not included.


## Shared capability second pass (unreleased)

Update `CoreStore` adapters with owner-scoped `renameChat(userId,id,title)` and `deleteChats(userId)`; the template implements both. Adopt the compatible Python runtime and Web bridge together for signed `deadlineMs`/`timeContext`. Existing snapshots remain v1 JSON; optional `chapters` needs no migration. `ReportsAdapter.preview` and `CoreConfig.explorationProvider`/`usageProvider` are optional, so existing adapters can upgrade before enabling those screens. The server now depends on the UI package's pure usage contract subpath; keep all six packages aligned.

Apply template route and exploration composition changes deliberately; package upgrades do not create customer routes or permissions. The generator now ships `docs/reuse-guide.md` along with canonical skills. Quota defaults support TokenFleet only, and entity/raw source authorization remains customer-owned. Read the reuse guide for actual exports and the verification record for executed checks. No package publication is implied by these local source changes.
