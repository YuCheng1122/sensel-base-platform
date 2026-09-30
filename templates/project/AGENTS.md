# Customer project working agreement

Read README.md, web/.env.example and the installed platform version's documentation. This repo owns pages, routes, Prisma schema/migrations/adapters, tools and prompts; platform packages own reusable auth/model/chat/runtime behavior.

Do not edit node_modules or installed Python wheels. Platform fixes belong upstream in a new version. Keep domain data authorization on the backend. Register tools explicitly in agent/main.py and the backend profile allowlist; never infer permission from a prompt.

Use isolated synthetic DB/model tests. Never commit .env, customer logs, PCAP files or credentials. Migration and generated Prisma client belong to this customer repo. No Elasticsearch is required unless this project intentionally adds it.

Run web typecheck/build and relevant behavior tests after changes. Document new settings and tool interfaces. Keep modules focused, avoid duplicated core implementations, and verify dynamic entrypoints before deleting candidates.

Replace the synthetic analysis provider with authorized project queries; do not copy SOC queries into platform packages. Overview and reports share `@sensel/analytics/contracts`; report creation persists one immutable snapshot. Reads and downloads must continue using that saved snapshot when the live provider is unavailable. Keep explicit synthetic/partial/unknown labels and preserve `public/fonts/` licensing for Chinese PDF exports.

Use the installed @sensel/server sendConfiguredMail coordinator for authorized mail; direct @sensel/mail transport calls do not provide durable deduplication. Preserve receipt records and stable operation UUIDs. Accepted does not establish inbox delivery; unknown must not trigger automatic resend. Mail fake mode requires MAIL_ALLOW_FAKE=true and APP_ENV=test/development. Keep customer notification policy, recipient authorization and scheduling in this repo.

Read DESIGN.md for frontend work. Use the generated sensel-frontend and sensel-ui-review skills under skills/ (discovered through .agents/skills and .claude/skills). Keep documentation in English; preserve the chosen product UI language. These copied instructions belong to this customer project and do not update automatically with npm packages.

For shared frontend capability selection and adapter examples, read `docs/reuse-guide.md` before rebuilding reports, tables, usage, exploration or Chat. Apply DESIGN.md route/detail/report defaults to new customer composition.
