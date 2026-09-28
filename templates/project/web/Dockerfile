FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY packages/ui/package.json packages/ui/package.json
COPY packages/chat/package.json packages/chat/package.json
COPY packages/server/package.json packages/server/package.json
COPY templates/project/web/package.json templates/project/web/package.json
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY packages ./packages
COPY templates/project/web ./templates/project/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run db:generate && npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/templates/project/web/.next/standalone ./
COPY --from=build --chown=node:node /app/templates/project/web/.next/static ./templates/project/web/.next/static
# Migration/bootstrap use an explicit one-shot job based on the build target.
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "templates/project/web/server.js"]
