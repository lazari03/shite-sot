# ShitShpejt

**Okazionet nuk presin.** A mobile-first Albanian flash marketplace: every listing has one fixed price and lives exactly **48 hours**. No auctions, no haggling, no endless relisting.

> Status: MVP implemented and tested locally (unit, integration, E2E, Docker image). Not deployed yet — see `docs/TODO.md`.

## Stack

Next.js 16 (App Router, RSC, Server Actions, React Compiler) · React 19 · TypeScript strict · Tailwind CSS v4 · PostgreSQL 17 + Prisma 7 · Better Auth · pg-boss · sharp + S3 (Hetzner Object Storage) · next-intl (sq/en) · Vitest + Playwright · Docker Compose + Caddy on Hetzner.

## Quick start

```bash
pnpm install
cp .env.example .env            # set BETTER_AUTH_SECRET (≥32 chars)
pnpm db:up                       # Postgres 17 in Docker (creates *_test and *_e2e DBs too)
pnpm db:deploy && pnpm db:seed   # schema + reference data (categories, cities, promotion prices)
pnpm db:seed:demo                # optional, DEV ONLY: listings labelled "DEMO"
pnpm dev                         # http://localhost:3000
pnpm worker:dev                  # expiry/promotions/cleanup jobs
```

Emails (verification, password reset) are printed to the console and appended to `.storage/outbox.jsonl` in development. Make yourself admin after registering: `pnpm admin:grant you@example.com`.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm i18n:check && pnpm test && pnpm build   # definition of done
pnpm test:e2e                                                               # Playwright, mobile + desktop
```

## Docs

| | |
|---|---|
| [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md) | Product spec (source of truth) |
| [`docs/design/prototype-v4.html`](docs/design/prototype-v4.html) | Visual source of truth |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, lifecycle, data model, jobs, routes |
| [`docs/adr/`](docs/adr/) | Decisions (pivot, technical choices) |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Server bootstrap, CI/CD, rollback, backups |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security review and known gaps |
| [`docs/BRAND.md`](docs/BRAND.md) | Colours, type, voice |
| [`docs/TODO.md`](docs/TODO.md) | External setup and deferred work |

## AI agents

`AGENTS.md` holds the shared rules (Codex, Claude Code, Gemini). Skills live in `.agents/skills/` (symlinked from `.claude/skills/`). Edit rules there only.
