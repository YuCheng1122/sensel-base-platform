# Configuration Reference

Web examples are in `templates/project/web/.env.example`; Compose examples are in `deploy/.env.example`. Secrets have no usable defaults. Restart affected services after runtime environment changes; UI model settings apply by saved version to new requests.

| Variable | Reader | Meaning |
| --- | --- | --- |
| DATABASE_URL | Web/Prisma | Required secret PostgreSQL URL; Agent does not need it |
| SETTINGS_ENCRYPTION_KEY | Web | Required 32-byte base64 key for model/mail encryption and mail fingerprints; back it up with the database and never replace it casually |
| AGENT_SHARED_SECRET | Web/Agent | Required, at least 32 characters; service authentication and profile signing; identical on both sides |
| AGENT_URL | Web | Agent address; code default is http://127.0.0.1:8000, while examples use http://127.0.0.1:8001 |
| BACKEND_URL | Agent template | Web address for customer tool callbacks; defaults to http://127.0.0.1:3000 |
| PUBLIC_APP_URL | Web | Trusted browser origin; required in production, with scheme/host/port and no path; arbitrary forwarded hosts are not trusted |
| MODEL_ALLOWED_ENDPOINTS | Web | Comma-separated exact model base URL allowlist; custom OpenAI-compatible endpoints must match; operators explicitly add internal endpoints |
| SECURE_COOKIES | Web | Defaults to true; use false only for local HTTP tests |
| APP_ENV | Web/Agent | production/development/test; fake providers require explicit development or test |
| MAIL_ALLOW_FAKE | Web | Defaults to false; also requires APP_ENV=test/development; independent of AGENT_ALLOW_FAKE |
| AGENT_ALLOW_FAKE | Web/Agent | Defaults to false; synthetic development/testing only; prohibited in production |
| ADMIN_EMAIL / ADMIN_PASSWORD | Bootstrap | Initial administrator creation; password length 12–72 characters; not required at every service start |
| BASE_URL | Browser tests | Test Web origin, default http://127.0.0.1:3210 |
| CORE_TEST_DATABASE_URL | Database tests | Explicit opt-in isolated localhost PostgreSQL database with a name ending in _audit |

Anthropic/Gemini use their default official endpoints; custom base URLs still require the allowlist. Synthetic tests do not establish real provider availability.

The template does not require `ES_HOST`, `REDIS_URL` or original Digiwin environment variables. Customers must document the purpose and startup conditions of optional storage integrations.

Administrators save Resend API keys, sender identity, enabled state and version in the database. Read APIs expose only `hasApiKey`. Leaving the key blank preserves it; it does not delete it. Resend has a fixed endpoint, does not use `MODEL_ALLOWED_ENDPOINTS`, and has no SMTP environment configuration. See [mail service](mail-service.md).
