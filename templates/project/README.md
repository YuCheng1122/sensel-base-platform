# Customer Analysis Project

Initialized from SenseL Base Platform. `web/` contains the Next.js composition layer and Prisma persistence; `agent/` contains project tools and prompts. Install shared capabilities from npm packages and the Python wheel rather than importing from the platform repository.

In `web/`, run `npm install` and `npm run db:generate`. Copy `web/.env.example` and configure an independent PostgreSQL database and secrets. Load the required environment variables, then run `npm run db:migrate`, `npm run db:bootstrap`, and `npm run dev`. Install the matching `sensel-agent-core` wheel in a Python virtual environment. From this repository's root, load the required values listed in `agent/.env.example` into the process environment and run `uvicorn main:app --app-dir agent --port 8001`.

Set `PUBLIC_APP_URL` to the browser origin. Set `AGENT_URL` and `BACKEND_URL` to the corresponding services, and use the same `AGENT_SHARED_SECRET` in both. Disable fake modes in production and enable secure cookies and HTTPS. Add Nginx or PCAP schemas, queries, pages and tools in this repository; Elasticsearch is optional.

Document your project's business requirements, tools, retention policy and deployment process. Never commit real customer data or secrets.

The platform Dockerfile uses the platform workspace as its build context and is not copied into this repository. Provide project-specific container and deployment configuration.

Shared features include event overviews, report downloads (immutable snapshots, PDF, CSV and JSON), platform settings and settings history. The six npm packages are `@sensel/ui`, `@sensel/chat`, `@sensel/analytics`, `@sensel/reports`, `@sensel/mail`, and `@sensel/server`. The template retains the SenseL brand and navigation; customer names and images are configurable.

`web/src/server/synthetic-analysis-provider.ts` supplies explicitly synthetic demonstration data. Replace it with your own `AnalysisProvider` and inject it in `web/src/server/core.ts`. Restrict sources and queries using the actor's `id`, `role` and `groupIds`. Represent event times as UTC instants, categories with stable IDs, and unknown statistics with `null`. A Nginx project can query only its own Prisma tables; PCAP parsing and file storage remain project-owned.

Report creation queries the provider once and persists the complete snapshot. Subsequent previews and exports do not query the source again. Providers must identify complete, partial or sampled coverage; the first 50 returned rows are not the full dataset. Keep the Chinese PDF font and its OFL license in `web/public/fonts/` when deploying. Saved report content and display timezones do not change when platform defaults change.

Administrators manage mail settings. Resend credentials are encrypted using `SETTINGS_ENCRYPTION_KEY`. `sendConfiguredMail` from `@sensel/server` provides durable deduplication and authorization, while `@sensel/mail` supplies a replaceable transport. The template currently requires an administrator actor. Replaying the same UUID returns the existing receipt; `accepted` does not mean delivered, and `unknown` outcomes are never automatically resent. Fake testing requires both `MAIL_ALLOW_FAKE=true` and `APP_ENV=test` or `APP_ENV=development`; disable fake mode in production. SMTP, webhooks, scheduling and subscriptions are not built in. Design and inject customer notification and report workflows explicitly.
