# CI/CD

[Documentation](README.md) · [Project home](../README.md)

The platform owns independent workflows; they do not push to, build from, or deploy the original customer repositories. No production endpoints or paid models run in CI.

## Table of Contents

1. [Continuous integration](#continuous-integration)
2. [Release publishing](#release-publishing)
3. [Production deployment](#production-deployment)
4. [Local validation](#local-validation)

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`/`development`, manual dispatch and release validation. It uses Node 22, Python 3.12, a disposable PostgreSQL 15 service and deterministic fake models explicitly enabled with `APP_ENV=test`, `AGENT_ALLOW_FAKE=true` and the separate `MAIL_ALLOW_FAKE=true`. Mail verification uses synthetic or mocked transports and sends no real email.

Checks install npm and uv locks, generate Prisma, run lint/types/boundaries/dead-code/document-link checks and tests, build Web, run Python lint/tests/build, install the wheel outside the repository, create an independent customer project from six npm tarballs, verify installed paths stay inside that customer project, match package versions and inherit dependency overrides (including the resolved PostCSS version), then build it, require the isolated `CORE_TEST_DATABASE_URL` ending in `_audit`, migrate before database integration tests, bootstrap a synthetic account, and run browser tests against actual Web/Agent processes. The container job builds Web/Agent/migration images, starts the Agent health smoke, then brings up the production Compose configuration with a clean PostgreSQL volume, applies migrations, bootstraps an account and verifies Web health/login plus secure cookie attributes. It removes only this disposable CI stack and volume afterward. Compose validation does not print resolved secrets. Test results (`platform-test-results`), Web/Agent service logs (`platform-service-logs`, when created) and package artifacts (`platform-packages`) are uploaded. Service logs are collected even when verification fails; they are synthetic test records, not production logs. Workflow source is implemented locally; GitHub execution is only proven after it runs on the remote repository.

## Release publishing

Create a GitHub release with a `vMAJOR.MINOR.PATCH` tag matching root, Web template, all platform package versions and every @sensel/* dependency pin; Python metadata must match too. `.github/workflows/release.yml` first executes the complete CI workflow, then publishes:

- `ghcr.io/avocadoai-lab/sensel-base-platform-web`
- `ghcr.io/avocadoai-lab/sensel-base-platform-agent`
- `ghcr.io/avocadoai-lab/sensel-base-platform-migrate` (Web build target with Prisma CLI/bootstrap tools)

Images carry version and full commit SHA tags, provenance/SBOM and OCI source/revision labels. Tags are references, not technically immutable registry objects; deploy the `@sha256:...` references recorded in job summaries for immutable releases. There is no floating `latest` tag. npm tarballs and Python wheel/source distribution are attached to the release; this does not publish to public npm/PyPI.

Only image publishing jobs receive `packages:write`; only release assets receive `contents:write`. CI has `contents:read`. GHCR uses `GITHUB_TOKEN`; first publication may require repository/org package policy configuration. No SSH key, remote deployment host or production secret is embedded. Publishing does not automatically deploy a customer's server. Do not run the release workflow until the version is intended for publication.

## Production deployment

`deploy/compose.yaml` requires PostgreSQL, Web, Agent, and a one-shot migration service. There is no Elasticsearch or Redis. Copy `deploy/.env.example` to a private file, generate independent secrets, and set all three image variables to the matching release digests. The database password must be URL-safe or URL-encoded in a customized `DATABASE_URL`. Keep `SETTINGS_ENCRYPTION_KEY` backed up securely: changing it without re-encrypting settings makes saved model/mail credentials unreadable and changes mail message fingerprints. Key rotation is not implemented; preserve the matching key with the database backup.

Run from repository root, replacing `/private/platform.env` with your protected file:

```sh
docker compose --env-file /private/platform.env -f deploy/compose.yaml config --quiet
docker compose --env-file /private/platform.env -f deploy/compose.yaml pull
docker compose --env-file /private/platform.env -f deploy/compose.yaml up -d
```

Compose waits for database health, successful migration, and Agent readiness before Web startup. Migration failure prevents Web starting. The production Compose environment fixes APP_ENV=production and disables both model and mail fake modes. The same images can run explicitly configured isolated tests; the image alone is not a production-mode gate. Agent uses one worker because cancellation is process-local. The Web port binds loopback; place your HTTPS reverse proxy on the host or adapt the Compose network. Set required `PUBLIC_APP_URL` to the exact external browser origin (for example `https://analysis.example.com`, without a path); this is the trusted origin for write-request checks and must match the URL users actually open. Secure cookies remain enabled; plain HTTP production access is intentionally not a login deployment configuration.

Create the initial administrator through the setup profile. Export `ADMIN_EMAIL` and `ADMIN_PASSWORD` privately in the shell (12–72 characters), then:

```sh
docker compose --env-file /private/platform.env -f deploy/compose.yaml --profile setup run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD bootstrap
unset ADMIN_PASSWORD
```

Bootstrap leaves an existing account unchanged. Do not put passwords in shell command arguments, committed files or CI output.

Before upgrading, back up PostgreSQL and record the old image digests. Test migrations against a restored isolated backup, then apply the matching migration/Web/Agent image set. Rolling back image tags alone does not reverse a database migration; restore the backup when required by the migration's compatibility notes. Named volume `postgres-data` persists data; do not use `down -v` on a customer deployment. Durable jobs, horizontal Agent scaling and automated backup scheduling remain customer deployment work.

## Local validation

```sh
docker build -f templates/project/agent/Dockerfile -t sensel-base-agent:local .
docker build -f templates/project/web/Dockerfile -t sensel-base-web:local .
docker build -f templates/project/web/Dockerfile --target build -t sensel-base-migrate:local .
```

The Agent image installs frozen production Python dependencies in a build stage and runs as UID 10001. Web runtime and migration image have separate responsibilities. Dockerfiles use the platform repository as build context; a generated customer repository needs its own build recipe for the published packages and its project code.
