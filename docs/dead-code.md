# Dead Code and Redundancy Review

Static tools identify candidates; they cannot prove that no dead code exists. In addition to imports, inspect Next routes, FastAPI decorators, tool registries, npm scripts, Compose commands, migrations, public exports and documentation entry points.

Extraction uses an explicit inclusion list rather than copying all legacy SOC/UI/scripts and cleaning afterward. Update lockfiles when removing dependencies, then verify production builds and independent package installation. Excluding a Digiwin feature does not delete it from the source repository.

`npm run boundaries` scans packages and python/src for core dependencies and the 400-line production-module limit. Templates and tool scripts still need manual review; this is not a full repository dependency analysis. `npm run lint` detects unused variables/imports. `npm run dead-code` adds Knip's dependency analysis. Register public package entry points correctly; do not delete a public API merely because one template does not use it.

Document retained compatibility code and its purpose. Do not hide unexplained candidates behind broad ignores. Avoid backup files, commented-out implementations and new/final copies. Similar code with different authorization or data semantics should not be forced into a function with many conditional parameters.
