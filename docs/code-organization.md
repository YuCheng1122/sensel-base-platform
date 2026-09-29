# Directories, Files and Naming

```text
packages/
  ui/src/                 Shared administration UI, forms, styles and API client
  chat/src/               Conversations, tool traces and SSE parser
  analytics/src/          Charts, overview and generic data contracts
  reports/src/            Snapshot UI and PDF/CSV/JSON export
  mail/src/               Mail contracts, Resend transport and guarded runtime
  server/src/             CoreStore, auth, models, Agent bridge and mail coordinator
python/
  src/sensel_agent/        FastAPI factory, providers, runtime, profiles, tools, traces
  tests/                  Synthetic Python contract tests
contracts/                Versioned cross-language protocols
templates/project/
  web/src/app/            Next.js composition and HTTP routes
  web/src/server/         Concrete Prisma adapters and configuration
  web/prisma/             Schema, migrations and bootstrap
  agent/main.py           Customer tool registration and application entry
scripts/                  Packaging, generation and architecture checks
tests/backend/            Web contracts, Prisma and streaming tests
tests/ui/                 Browser and parser tests
deploy/                   Compose and environment examples
docs/                     Architecture, operations, decisions and verification
```

Templates, tests and deploy directories live at the repository root. Do not place production application source in docs or scripts.

Use kebab-case for custom TypeScript filenames, PascalCase for React components, and useXxx for hooks. Keep Next's `page.tsx`, `layout.tsx` and `route.ts` conventions. Python modules/functions use snake_case and classes use PascalCase. Tests use `*.test.ts`, `*.spec.ts` or `test_*.py`. Common entry documents are README.md, AGENTS.md and DESIGN.md.

Put customer pages in the customer's `web/src/app/`. HTTP routes adapt requests; business workflows belong in customer server modules. Place tools in customer `agent/`, register them in ToolRegistry, and enable them in the Web-signed allowlist. Change packages or Python core only for confirmed shared capabilities.

Keep production modules focused and below 400 lines. Avoid utility buckets, backup implementations and empty directories reserved for hypothetical work. `npm run boundaries` checks core dependency direction; package READMEs describe individual responsibilities.
