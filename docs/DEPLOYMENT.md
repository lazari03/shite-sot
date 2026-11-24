# Deployment (Hetzner · Docker Compose · Caddy)

One image (`docker/Dockerfile`) with three roles selected by the command: `web` (Next.js standalone, non-root, health-checked), `worker` (pg-boss jobs) and `migrate` (`prisma migrate deploy` + idempotent reference seed). The same image tag is promoted staging → production.

> Nothing has been deployed yet. The steps below are what the workflows and scripts in this repo do; the server, DNS, secrets and buckets must be created first (see `docs/TODO.md`).

## 1. Server bootstrap (once per VM)

Ubuntu 24.04, Hetzner Cloud Firewall: 22 (your IP), 80, 443 TCP+UDP. The Hetzner host runs the web app and worker. Both connect to Supabase PostgreSQL over TLS.

```bash
adduser --disabled-password deploy && usermod -aG docker deploy
# Docker Engine + compose plugin, unattended-upgrades, fail2ban, ufw (22/80/443)
mkdir -p /opt/shitshpejt/docker && chown -R deploy: /opt/shitshpejt
```

Files the deploy user creates by hand in `/opt/shitshpejt` (never in git):

| File | Contents |
|---|---|
| `.env` | app config, see `.env.example`. Production: `APP_ENV=production`, `SITE_URL=https://shitshpejt.al`, `BETTER_AUTH_URL` same, `BETTER_AUTH_SECRET=$(openssl rand -base64 48)`, `DATABASE_URL` set to the [Supabase direct or session pooler URI](https://supabase.com/docs/guides/database/connecting-to-postgres) on port 5432 with `sslmode=require`, `STORAGE_DRIVER=s3` + `S3_*`, `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`, `ANALYTICS_SALT=<random>` |
| `.deploy.env` | `DOMAIN=shitshpejt.al`, `ACME_EMAIL=ops@…` (read by `deploy.sh` for Caddy) |

`chmod 600 .env`. Enter the Supabase database URI in the server environment over a secure channel. Use the session pooler on an IPv4-only host. The web, worker, and migrate roles all use this URI.

## 2. GitHub configuration

Environments `staging` and `production` (add a required reviewer on production) with:

- Secrets: `DEPLOY_SSH_KEY` (ed25519 private key of `deploy`), `DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <host>`), `DEPLOY_HOST`, `DEPLOY_USER`.
- Variables: `PUBLIC_URL` (e.g. `https://staging.shitshpejt.al`).
- The server must be able to pull from GHCR: the workflow logs in with the job's `GITHUB_TOKEN`; for long-lived pulls create a read-only PAT and `docker login ghcr.io` once on the server.

## 3. Pipeline

- `ci.yml` (PRs + main): install → lint → typecheck → i18n check → Vitest (real Postgres service) → `next build` → Playwright (mobile + desktop) → Docker build.
- `deploy.yml`: after CI succeeds on `main` → build/push `ghcr.io/<repo>:<sha>` (skipped if it exists) → ship `compose.prod.yaml`, `Caddyfile`, `deploy.sh` → `deploy.sh <sha>` on the server → public `/api/health` check. Production: run the workflow manually with `environment=production` and the SHA that is already on staging.

`scripts/deploy.sh` on the server: pull → `docker compose up -d --wait` (the one-shot `migrate` service runs first; web/worker wait for it) → poll health → on failure **automatically restarts the previous tag** → record `.current_tag`/`.previous_tag` → prune dangling images and unused images older than 7 days (never volumes, never images used by running containers).

Manual deploy / first boot:

```bash
cd /opt/shitshpejt
TAG=<sha> docker compose -f compose.prod.yaml up -d --wait
docker compose -f compose.prod.yaml exec web node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
```

Grant the first admin (after registering through the UI):

```bash
TAG=$(cat .current_tag) docker compose -f compose.prod.yaml run --rm migrate admin-grant you@example.com
```

## 4. Rollback

```bash
cd /opt/shitshpejt
bash deploy.sh "$(cat .previous_tag)"
```

Migrations must be **backward compatible** (expand → migrate → contract across two releases) so the previous image always runs against the new schema. Never run `prisma migrate dev`/`db push` against staging or production. If a migration itself must be reverted, restore from backup (below) — don't hand-edit `_prisma_migrations`.

## 5. Backups & restore

Use [Supabase database backups](https://supabase.com/docs/guides/platform/backups) for Postgres. The application schema can also be exported with `make server-backup HOST=...`. That export covers the public schema. Enable Hetzner backups or bucket versioning separately for uploaded media.

Before a production cutover, inventory and back up any existing Hetzner data. If data needs to be preserved, restore it to a staging target and verify users, listings, ownership and worker jobs before changing production credentials.

## 6. Operations

- Logs: `docker compose -f compose.prod.yaml logs -f web worker` (JSON, sensitive keys redacted, rotated 5×10 MB).
- Worker health: `/admin/shendeti` shows each job's last run; `listings.expire` older than 5 min is flagged. Discovery stays correct even if the worker is down.
- Uptime: external monitor on `https://<domain>/api/health`.
- Errors: hook Sentry/GlitchTip into `src/server/logger.ts` when the DSN exists (see TODO).
- Local storage driver keeps images on the `media` volume — fine for staging; use S3 in production.
