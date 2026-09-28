# Customer project working agreement

Read README.md, web/.env.example and the installed platform version's documentation. This repo owns pages, routes, Prisma schema/migrations/adapters, tools and prompts; platform packages own reusable auth/model/chat/runtime behavior.

Do not edit node_modules or installed Python wheels. Platform fixes belong upstream in a new version. Keep domain data authorization on the backend. Register tools explicitly in agent/main.py and the backend profile allowlist; never infer permission from a prompt.

Use isolated synthetic DB/model tests. Never commit .env, customer logs, PCAP files or credentials. Migration and generated Prisma client belong to this customer repo. No Elasticsearch is required unless this project intentionally adds it.

Run web typecheck/build and relevant behavior tests after changes. Document new settings and tool interfaces. Keep modules focused, avoid duplicated core implementations, and verify dynamic entrypoints before deleting candidates.
