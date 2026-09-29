# @sensel/mail

Server-only, dependency-free TypeScript mail runtime for customer notifications and reports. Resend is built in; SMTP is not. A customer may inject a `MailTransport` to use another transport. Do not expose this module or decrypted configuration to browser bundles.

```ts
import { sendMail } from "@sensel/mail";
const result = await sendMail(currentConfig, {
  to: ["recipient@example.invalid"],
  subject: "Report available",
  text: "Your report is ready.",
  expectedVersion: currentConfig.version,
  idempotencyKey: "tenant-id:report-id:recipient-id",
});
```

The integrating server must authorize recipients and purpose, atomically reserve a durable tenant-scoped idempotency key plus message fingerprint, and reload the current enabled configuration immediately before sending. Existing reservations, including unknown or in-flight attempts, must not dispatch again. Reject reuse with different content; persist the final result. A crash after dispatch leaves an unknown outcome, never permission to retry automatically. The platform server supplies this persistent coordinator; this package deliberately has no database dependency. Resend also receives the same key, but provider deduplication does not replace your durable ledger.

`accepted` means the provider returned a valid message ID, not that the destination received the email. `rejected` means validation failed or the provider explicitly rejected it. `cancelled` is reserved for a known pre-dispatch cancellation, disabled configuration, or version mismatch. A timeout, interruption after dispatch, transport exception, malformed receipt, or server error yields `unknown`. There are no automatic retries and no raw provider errors or secrets in results. Delivery webhooks and actual delivery tracking are not included.

The built-in adapter uses only `https://api.resend.com/emails`, refuses redirects, bounds receipt data to 128 KiB, and times out after 14 seconds including body consumption. Transport injection is server-owned, never a user-configurable endpoint. HTML is caller-owned: escape untrusted values before composing it. Recipient count and message content are bounded; attachments are not built in.

Fake configuration returns a clearly `synthetic: true` result only with explicit `allowFake: true`. The server must derive this from BOTH its test/development environment and a separate opt-in flag; production must never set it. Fake mode performs no network request. Automated tests use only injected HTTP responses and synthetic addresses.

Contracts, including public settings and delivery metadata, are exported from `@sensel/mail/contracts`. API keys exist only in `MailRuntimeConfig`; storage encryption and administrative authorization belong to the server. The package requires Node 20.19+ and ships TypeScript source for consumer compilation.

Resend documents a [24-hour idempotency window and 256-character key limit](https://resend.com/docs/dashboard/emails/idempotency-keys). The application ledger remains authoritative beyond that provider window. No exactly-once inbox delivery is promised. Provider acceptance and actual delivery are distinct [webhook event stages](https://resend.com/docs/webhooks/event-types); this package does not process webhooks.
