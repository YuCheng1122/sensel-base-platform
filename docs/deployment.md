# Deployment and Recovery

The minimum production services are PostgreSQL, Web and Agent. Compose adds a one-shot migration service and optional bootstrap; it requires neither Elasticsearch nor Redis. Web runtime, Agent runtime and migration images have separate responsibilities so the Web image does not carry all development tools.

The [CI/CD guide](ci-cd.md) documents image names and configuration; `deploy/.env.example` lists required parameters. Use an HTTPS reverse proxy, set `PUBLIC_APP_URL` to its external origin and keep `SECURE_COOKIES=true`. Compose exposes Web only on 127.0.0.1; proxy and certificates belong to the deployment environment.

For upgrades: back up database and encryption key → record current image digests → validate migration → update images → check health, login, saved model settings and Chat. `SETTINGS_ENCRYPTION_KEY` protects model/mail credentials and mail fingerprints. Stopping services does not re-encrypt data; do not simply replace the key. Automated key rotation is not implemented.

Recovery is not blindly restarting an old image. Verify schema compatibility first, and restore a tested backup when needed. This repository does not provide customer RPO/RTO guarantees or evidence of a production disaster-recovery exercise.

Web health checks storage; Agent readiness checks local runtime startup. Neither proves availability of real model providers or customer tools. Model checks require an explicit UI action; never trigger paid inference from health checks.

One Web/Agent instance is the verified boundary. Shared multitenancy, horizontal scaling, durable jobs and customer data migration need separate acceptance work.
