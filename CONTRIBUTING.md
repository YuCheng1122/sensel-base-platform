# Contributing to SenseL

[Project home](README.md) · [Documentation](docs/README.md) · [Coding agent guide](AGENTS.md)

This guide is for developers changing the shared platform. To add customer capabilities such as Nginx or PCAP analysis, start with [creating a customer project](docs/create-project.md).

## Table of Contents

1. [Before Making Changes](#before-making-changes)
2. [Code and Documentation](#code-and-documentation)
3. [Validating Changes](#validating-changes)
4. [Submitting Changes](#submitting-changes)
5. [Reporting a Problem](#reporting-a-problem)

## Before Making Changes

Read [architecture](docs/architecture.md) and [code organization](docs/code-organization.md), then create an isolated environment using [local development](docs/development.md). Use Node.js >=20.19, Python >=3.12 and the repository's npm/uv lockfiles.

Reusable capabilities belong in `packages/` or `python/`. Customer schemas, analysis tools, prompts, pages and deployments belong in customer repositories. Shared core accesses storage through contracts; it does not import customer Prisma clients or `@/` aliases, or require Elasticsearch.

## Code and Documentation

- Keep each production module focused and below 400 lines. Avoid duplicate implementations, unused abstractions and large utility collections.
- Follow [DESIGN.md](DESIGN.md) for UI changes, preserve layout and interaction hierarchy, and inspect desktop/mobile behavior.
- Update documentation whenever API contracts, environment variables, tables, tools or installation steps change.
- Update the [extraction inventory](docs/extraction-inventory.md) and [verification record](docs/verification.md); record only checks actually executed.
- Use synthetic data, fake providers and disposable databases. Never commit credentials, cookies, environment files or customer data.

## Validating Changes

Choose checks appropriate to the change; see [testing](docs/testing.md):

```sh
npm run check
npm run dead-code
npm run docs:check
```

Run `npm test` for backend changes. Persistence changes require isolated PostgreSQL integration tests; skipped tests are not a pass. UI changes require `npm run test:ui` against isolated Web/Agent services. Python changes require Ruff and pytest. Package/template changes also require an independent installation and build outside the repository.

For documentation formatting only, run `npm run docs:check` and manually inspect heading anchors, images and GitHub Markdown rendering. Link checks do not establish technical correctness.

## Submitting Changes

Run `git diff --check` and inspect the diff for generated artifacts and secrets. Explain the problem, resulting behavior, checks performed and remaining limitations in the pull request. Include upgrade impact for dependency or migration changes.

Passing CI does not replace project review. Releases publish package assets and GHCR images; do not use a release as a routine test action. See [CI/CD](docs/ci-cd.md).

## Reporting a Problem

Contact maintainers, or create an issue when repository Issues are enabled, with:

- Commit/version, page or feature, and environment.
- Reproduction steps, expected behavior and actual behavior.
- Redacted screenshots, status codes or error messages.

For visual issues include browser and viewport width; for CI include the run link and first failed step. Never include passwords, API keys, cookies or raw customer data.
