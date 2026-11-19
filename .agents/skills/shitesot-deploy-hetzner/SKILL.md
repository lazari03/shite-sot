---
name: shitesot-deploy-hetzner
description: ShitShpejt infrastructure and deployment on Hetzner. Use when working on Dockerfile, docker compose, Caddy, GitHub Actions CI/CD, environment variables (src/env.ts, .env.example), staging/production setup, database backups, Hetzner Cloud servers, Hetzner Object Storage buckets, monitoring, or release procedures.
---

# ShitShpejt on Hetzner

> The implemented setup is documented in `docs/DEPLOYMENT.md` (`docker/Dockerfile` roles web | worker | migrate, `compose.prod.yaml`, `scripts/deploy.sh` with auto-rollback). Where this skill differs, DEPLOYMENT.md wins.

**Target:** simplest production-ready setup. One Hetzner Cloud VM per environment running Docker Compose. No Kubernetes. Upgrade path is documented, not built.

## Topology

| Env | Server | Contents |
|---|---|---|
| staging | CX22 (2 vCPU / 4 GB), Falkenstein or Helsinki | caddy, web, worker, postgres |
| production | CPX31 / CCX13 (4 vCPU / 8 GB) | caddy, web, worker, postgres |
| storage | Hetzner Object Storage (S3, `fsn1`) | `shitesot-prod-media`, `shitesot-staging-media`, `shitesot-backups` |

Firewall (Hetzner Cloud Firewall): inbound 22 (your IP only), 80, 443 (TCP+UDP for HTTP/3). Postgres is **never** exposed publicly.

Upgrade path when needed: move Postgres to a dedicated box or managed DB → put the Hetzner Load Balancer in front of 2+ web VMs → add a CDN for media.

## Files

```
docker/
├── Dockerfile          # multi-stage: deps → build → runner (node:lts-alpine, non-root, standalone output)
├── Caddyfile
compose.yaml            # local dev: postgres, minio, mailpit
compose.prod.yaml       # caddy, web, worker, postgres (+ volumes, healthchecks)
.github/workflows/
├── ci.yml              # lint, typecheck, test (with postgres service), build, playwright
└── deploy.yml          # on tag/main: build image → GHCR → ssh → compose pull && up -d
scripts/
├── migrate.sh          # prisma migrate deploy (runs as one-shot container before web starts)
└── backup.sh           # pg_dump | zstd | upload to Object Storage
```

## Dockerfile essentials

- `next.config.ts`: `output: "standalone"`.
- Build once, promote the same image tag staging → production (`ghcr.io/lazari03/shite-sot:<sha>`).
- Runner: `USER node`, `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, copy `.next/standalone`, `.next/static`, `public`, `prisma`.
- Worker uses the same image with `command: ["node", "dist/worker.js"]` (bundle the worker with `tsup` in the build stage).
- `HEALTHCHECK` → `GET /api/health` (checks DB connectivity).

## compose.prod.yaml essentials

```yaml
services:
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443", "443:443/udp"]
    volumes: [./docker/Caddyfile:/etc/caddy/Caddyfile:ro, caddy_data:/data, caddy_config:/config]
    depends_on: [web]
  migrate:
    image: ghcr.io/lazari03/shite-sot:${TAG}
    command: ["npx", "prisma", "migrate", "deploy"]
    env_file: .env
    depends_on: { postgres: { condition: service_healthy } }
    restart: "no"
  web:
    image: ghcr.io/lazari03/shite-sot:${TAG}
    env_file: .env
    depends_on: { migrate: { condition: service_completed_successfully } }
    restart: unless-stopped
  worker:
    image: ghcr.io/lazari03/shite-sot:${TAG}
    command: ["worker"]
    env_file: .env
    depends_on: { migrate: { condition: service_completed_successfully } }
    restart: unless-stopped
  postgres:
    image: postgres:17
    env_file: .env.db
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER"], interval: 5s, retries: 10 }
    restart: unless-stopped
volumes: { pgdata: {}, caddy_data: {}, caddy_config: {} }
```

## Caddyfile

```
shitesot.al, www.shitesot.al {
  encode zstd gzip
  @www host www.shitesot.al
  redir @www https://shitesot.al{uri} permanent
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
    -Server
  }
  @static path /_next/static/*
  header @static Cache-Control "public, max-age=31536000, immutable"
  reverse_proxy web:3000
}
```
(The CSP is set by Next.js middleware with a nonce, not by Caddy.)

## Environment variables

All validated in `src/env.ts` with Zod (`@t3-oss/env-nextjs` or a plain Zod parse). The app refuses to boot on invalid config. Keep `.env.example` in sync.

| Var | Notes |
|---|---|
| `DATABASE_URL` | `postgresql://…@postgres:5432/shitesot` |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | |
| `S3_ENDPOINT` | `https://fsn1.your-objectstorage.com` |
| `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | |
| `RESEND_API_KEY`, `EMAIL_FROM` | `ShitShpejt <njoftime@shitesot.al>` |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | |
| `SITE_URL` | canonical base URL |
| `APP_ENV` | `development \| staging \| production` (distinct from NODE_ENV) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | phase 2 |

Secrets live in GitHub Environments (`staging`, `production`) and are written to `/opt/shitesot/.env` on deploy. Never in the repo, never in the image.

## CI/CD

- `ci.yml` on every PR: `pnpm install --frozen-lockfile` → lint → typecheck → vitest (postgres service) → `next build` → Playwright (mobile Chrome + WebKit).
- `deploy.yml`: push to `main` → build & push image `:sha` → deploy to **staging** automatically. Git tag `v*` → manual approval (GitHub Environment protection) → deploy the same `:sha` to **production**.
- Deploy step over SSH (deploy user, key in secrets): `cd /opt/shitesot && TAG=<sha> docker compose -f compose.prod.yaml pull && TAG=<sha> docker compose -f compose.prod.yaml up -d --remove-orphans && docker image prune -f`.
- Rollback: re-run deploy with the previous `TAG`. Migrations must be **backward-compatible** (expand → migrate → contract) so rollback is always safe.

## Backups & recovery

- Nightly `pg_dump -Fc | zstd` → `s3://shitesot-backups/prod/YYYY/MM/DD.dump.zst` (systemd timer or a `backup` compose service with cron). Keep 14 daily, 8 weekly, 12 monthly (bucket lifecycle rules).
- Hetzner automatic server backups enabled (+20% cost) as a second layer.
- **Restore drill monthly** on staging. An untested backup isn't a backup.
- Media bucket: versioning on.

## Server bootstrap (once per VM)

Ubuntu 24.04 LTS → create the `deploy` user, disable password + root SSH, `ufw` (in addition to the Cloud Firewall), `unattended-upgrades`, Docker Engine + compose plugin, `fail2ban`, `/opt/shitesot` owned by deploy, log rotation for Docker (`json-file` max-size 10m). Script it in `scripts/bootstrap-server.sh` (idempotent) or cloud-init.

## Monitoring

- Sentry (or self-hosted GlitchTip) for web + worker errors, with releases tagged by git SHA.
- Uptime: external check on `/api/health` (Better Stack / UptimeRobot).
- Node exporter + cAdvisor optional later. Start with `docker stats` and Hetzner Cloud graphs.
- Disk alert at 80% (Postgres volume).

## Don'ts

- ❌ Exposing Postgres port 5432
- ❌ Building images on the server
- ❌ `prisma migrate dev` or `db push` against staging/prod
- ❌ Destructive migrations without the expand/contract steps
- ❌ Seed scripts running when `APP_ENV=production`
