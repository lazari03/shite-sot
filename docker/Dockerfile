# syntax=docker/dockerfile:1.7
# ShitShpejt — one image, three roles: web (Next standalone), worker (pg-boss), migrate (prisma + seed).
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /src

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /src/node_modules ./node_modules
COPY . .
# Build needs no runtime secrets: env is validated lazily at request time.
RUN pnpm exec prisma generate && pnpm exec next build && pnpm worker:build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --ignore-scripts \
 && pnpm rebuild sharp @prisma/engines prisma \
 # The ops layer (worker/migrate/seed) never runs Next.js or UI code; the web layer ships its own traced deps.
 && rm -rf node_modules/next node_modules/lucide-react node_modules/.pnpm/next@* node_modules/.pnpm/@next+swc-* node_modules/.pnpm/lucide-react@*

FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# web: Next standalone server
COPY --from=build --chown=node:node /src/.next/standalone ./web
COPY --from=build --chown=node:node /src/.next/static ./web/.next/static
COPY --from=build --chown=node:node /src/public ./web/public
# ops: worker, migrations, seed (full prod deps incl. prisma CLI)
COPY --from=prod-deps --chown=node:node /src/node_modules ./ops/node_modules
COPY --from=build --chown=node:node /src/dist ./ops/dist
COPY --from=build --chown=node:node /src/prisma ./ops/prisma
COPY --from=build --chown=node:node /src/prisma.config.ts /src/package.json ./ops/
COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint && mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["tini", "--", "entrypoint"]
CMD ["web"]
