# Extraction provenance

Read-only source: `sensel-full-stack/src/server/services/mail-provider.ts` and `mail-runtime.ts`, plus their tests and managed-mail configuration service.

Retained: fixed Resend endpoint, bounded request duration and response size, safe outcomes for provider failures, version check before send, and one runtime shared by notification producers.

Adapted: native Node fetch replaces node-fetch; `sent` is now `accepted` because a receipt does not establish delivery. Idempotency headers, explicit pre-dispatch cancellation, dependency injection, shared public contracts, bounded input, and synthetic opt-in are explicit. Database encryption/configuration resolution and durable send reservations are owned by @sensel/server and template adapters, not duplicated here. Customer account flows, SOC notification text, source credentials and real messages were not copied. SMTP and delivery webhooks are not implemented.

Tests cover receipt semantics, fixed endpoint/redirect behavior, version and enable gates, input validation, response limits, HTTP classification, timeouts, cancellation, no retries and no raw secret propagation. All recipients and keys are synthetic; no real send was performed.
