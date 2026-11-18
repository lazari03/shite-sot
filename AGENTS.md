# AGENTS.md — ShiteSot

> Canonical instructions for every AI coding agent working in this repo (OpenAI Codex / ChatGPT, Claude Code, Gemini CLI, Cursor, etc.).
> `CLAUDE.md` and `GEMINI.md` import this file — **edit rules here, not there.**

## What we're building

**ShiteSot — _Shite shpejt. Gjej lirë._** A mobile-first marketplace for Albania (Tirana electronics first), built around fast selling, genuine price drops, urgent sales and buyer-driven alerts. Albanian (`sq`) by default, English (`en`) supported. Currency: Albanian Lek (ALL), stored as integers.

The full product spec is in [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md). It is the source of truth for product decisions. When it conflicts with this file on *product* behaviour, the spec wins. When it conflicts on *engineering* conventions, this file wins.

## Read before you work

| When you're about to… | Read |
|---|---|
| Touch any UI, styling, layout, component, animation | `.agents/skills/shitesot-design/SKILL.md` |
| Touch Prisma schema, server actions, route handlers, auth, jobs, search | `.agents/skills/shitesot-backend/SKILL.md` |
| Touch Docker, CI, env, infra, Hetzner | `.agents/skills/shitesot-deploy-hetzner/SKILL.md` |
| Make an architecture decision | `docs/ARCHITECTURE.md` |
| Pick a colour, font, icon, or write copy | `docs/BRAND.md` |

Skills load automatically in Codex and Gemini (`.agents/skills`) and in Claude Code (`.claude/skills` → symlink). If your tool doesn't auto-load skills, open the `SKILL.md` yourself.

## Stack (do not swap without an ADR in `docs/adr/`)

- **Next.js** (latest stable, App Router, RSC, Server Actions, `output: "standalone"`) + **TypeScript strict**
- **React** (latest, with React Compiler enabled)
- **Tailwind CSS v4** (CSS-first `@theme`, no `tailwind.config.js`) + CSS custom properties for the liquid-glass layer
- **PostgreSQL 17** + **Prisma** (latest, `prisma.config.ts`)
- **Better Auth** (email magic link + Google OAuth, Prisma adapter)
- **Zod** for all input validation (shared client/server)
- **pg-boss** for background jobs (Postgres-backed, no Redis)
- **Hetzner Object Storage** (S3 API) for images, **sharp** for variants
- **next-intl** (`sq` default, `en`)
- **Serwist** for PWA / service worker
- **Resend** (or Postmark) for transactional email, behind an `EmailProvider` interface
- **Sentry** (or self-hosted GlitchTip) for errors
- **Vitest** (unit/integration) + **Playwright** (E2E, mobile viewport first)
- **Docker Compose + Caddy** on **Hetzner Cloud**

Package manager: **pnpm**. Node: LTS pinned in `.nvmrc`.

## Commands

```bash
pnpm dev               # Next dev server
pnpm worker:dev        # pg-boss worker
pnpm db:up             # docker compose up postgres minio mailpit
pnpm db:migrate        # prisma migrate dev
pnpm db:seed           # DEV ONLY demo data (clearly labelled "DEMO")
pnpm lint              # eslint
pnpm typecheck         # tsc --noEmit
pnpm test              # vitest
pnpm test:e2e          # playwright
pnpm build             # production build
```

**Definition of done for any change:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass. If you add a user flow, add or extend a Playwright test for it.

## Non-negotiable product rules

These come from the spec and break trust if violated. Never "temporarily" bend them.

1. **No fake data in production.** No fake listings, sellers, stats, counters, reviews. Seeds run only when `NODE_ENV !== "production"` and every seeded record says `DEMO`.
2. **Price drops are only shown when `PriceHistory` records a real reduction.** Never invent an "original price".
3. **Urgent-sale deadlines are set by the seller and never auto-reset.** At expiry, remove the badge or transition state. No fake countdowns.
4. **Paid placements are always labelled** ("Sponsorizuar") and never fully override relevance.
5. **A WhatsApp click is not a sale.** Never label or count it as one.
6. **No scraping** of MerrJep, Facebook Marketplace, or any third-party platform.
7. **No placeholder buttons that look functional.** If it isn't wired, don't render it.
8. **Seller contact info is shown only with the seller's consent.** No exact home addresses, ever.
9. **Browsing never requires an account.**

## Engineering conventions

- **Feature-first folders.** Domain logic lives in `src/features/<domain>/`. See `docs/ARCHITECTURE.md`.
- **Server is the source of truth.** Every mutation goes through a Server Action or Route Handler that: (1) authenticates, (2) authorises (role + ownership), (3) validates with Zod, (4) rate-limits where public, (5) writes an `AuditLog` row for admin actions.
- **Never trust the client** for price, ownership, role, listing state, or promotion status.
- **Money is `Int` lek.** No floats, no `Decimal` for ALL. Format with `Intl.NumberFormat("sq-AL")`.
- **Time is UTC in the DB**, rendered in `Europe/Tirane`.
- **Listing state changes go through one function** (`transitionListing()` in `features/listings/state.ts`) so rules + price history + notifications stay consistent.
- **No secrets in code.** Everything through `src/env.ts` (Zod-validated `process.env`). Update `.env.example` when you add a var.
- **Strings are i18n keys** (`messages/sq.json`, `messages/en.json`). Albanian first; never hardcode user-facing English.
- **Accessibility:** semantic HTML, 44×44px minimum touch targets, visible focus, `prefers-reduced-motion` and `prefers-reduced-transparency` respected.
- **Dependencies:** prefer the platform and existing deps. Adding a dependency needs a one-line reason in the PR.
- **No premature microservices.** One Next.js app + one worker process + Postgres.

## Git

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`.
- Conventional commits (`feat(listings): add price-drop badge`).
- Small PRs. Each PR states: what, why, how it was tested, screenshots for UI (mobile 390px first).
- Never commit `.env*` (except `.env.example`), credentials, or production data.

## When unsure

Choose the simplest option that satisfies the spec and keeps the door open. Write it down in `docs/adr/NNNN-title.md` (context → decision → consequences, ≤1 page). Record unfinished work in `docs/TODO.md`.
