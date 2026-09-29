# Releases

Current shared version: 0.1.0 for @sensel/ui, @sensel/chat, @sensel/analytics, @sensel/reports, @sensel/mail, @sensel/server and sensel-agent-core, with runtime contract v1. Arbitrary version combinations are not supported.

Before releasing, run check, isolated database tests, Python tests, production build, browser tests, independent package installation and container smoke. Synchronize package manifests, internal dependency pins, lockfiles and Python metadata.

A published GitHub release tagged vMAJOR.MINOR.PATCH reruns CI, attaches tgz/wheel assets and publishes GHCR images. See [CI/CD](ci-cd.md) for permissions and workflow details. There is no automatic customer-host deployment or npm/PyPI publishing.

Record deployment versions with image digests. Git tags do not replace customer upgrade testing; customer lockfiles retain exact versions and integrity information.
