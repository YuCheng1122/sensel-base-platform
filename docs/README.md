# SenseL Documentation

[Project home](../README.md) · [Contributing](../CONTRIBUTING.md) · [Coding agent guide](../AGENTS.md)

Documentation for installation, daily use, customer extensions and operations.

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Guides](#user-guides)
3. [Developer Guides](#developer-guides)
4. [Operations](#operations)
5. [Quality and Project Status](#quality-and-project-status)

## Getting Started

1. [About the platform](../README.md#about-sensel): shared capabilities and customer responsibilities.
2. [Local development](development.md): dependencies, initialization and Web/Agent startup.
3. [Configuration](configuration.md): database, keys, service addresses and administrator setup.
4. [Self-review](self-review.md): inspect pages, code and CI.

For another customer, start with [creating an independent project](create-project.md).

## User Guides

| Task | Guide |
| --- | --- |
| Check authentication, accounts, models and conversations | [Manual acceptance checklist](self-review.md) |
| Understand groups and actual access rules | [Groups and permissions](groups-and-permissions.md) |
| Use event overview and report downloads | [Analytics and reports](analytics-and-reports.md) |
| Configure mail and inspect delivery states | [Mail service](mail-service.md) |
| Understand Agent tools and execution states | [Agent runtime](agent-runtime.md) |

## Developer Guides

| Topic | Documents |
| --- | --- |
| Shared/customer ownership | [Architecture](architecture.md) · [Decision record](decisions/0001-independent-customer-projects.md) |
| Directories, filenames and code | [Code organization](code-organization.md) · [UI design](../DESIGN.md) · [Frontend skills](frontend-skills.md) |
| Reuse roadmap and required defaults | [Nginx capability review and implementation batches](base-evolution.md) |
| Reusable components and recipes | [Component catalog and working integration guide](reuse-guide.md) |
| Customer extensions | [Create a project](create-project.md) · [Analytics/report integration](analytics-and-reports.md) |
| Database and HTTP | [Storage](data-storage.md) · [API contract](api-contract.md) |
| Python and service protocol | [Python package](../python/README.md) · [Runtime v1](../contracts/runtime-v1.md) |
| Changes and submissions | [Contributing](../CONTRIBUTING.md) · [Coding agent guide](../AGENTS.md) |

## Operations

- [Deployment and recovery](deployment.md): services, HTTPS, backups and recovery limits.
- [CI/CD](ci-cd.md): automated checks, images, releases and deployment commands.
- [Releases](release.md): package versions and release checks.
- [Upgrading](upgrading.md): package, customer template and migration responsibilities.

## Quality and Project Status

- [Testing](testing.md): isolated backend, Python, browser and package verification.
- [Dead-code review](dead-code.md): tools and interpretation.
- [Extraction inventory](extraction-inventory.md): moved, retained and deferred capabilities.
- [Verification record](verification.md): executed checks, fixes and unverified boundaries.

Update code and documentation together. New shared capabilities also require updates to the extraction inventory, testing instructions and this index.
