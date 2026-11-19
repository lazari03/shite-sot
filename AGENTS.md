# AGENTS.md — ShitShpejt

> Canonical instructions for every AI coding agent working in this repo (OpenAI Codex / ChatGPT, Claude Code, Gemini CLI, Cursor, etc.).
> `CLAUDE.md` and `GEMINI.md` import this file — **edit rules here, not there.**

## What we're building

**ShitShpejt — _Okazionet nuk presin._** A mobile-first Albanian flash marketplace: fixed-price listings that live exactly **48 hours** after they go public. No auctions, no bidding, no haggling, no automatic relisting. Albanian (`sq`) by default, English (`en`) supported. EUR first, ALL supported in the data model. (The repo was scaffolded as "ShiteSot"; see `docs/adr/0001-pivot-to-shitshpejt.md`.)

The product spec is [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md); the visual spec is [`docs/design/prototype-v4.html`](docs/design/prototype-v4.html). When the spec conflicts with this file on *product* behaviour, the spec wins. When it conflicts on *engineering* conventions, this file wins.

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

- **Next.js 16** (App Router, RSC, Server Actions, `output: "standalone"`, `src/proxy.ts` instead of middleware) + **TypeScript strict**
- **React** (latest, with React Compiler enabled)
- **Tailwind CSS v4** (CSS-first `@theme` in `src/styles/globals.css`, no `tailwind.config.js`) with tokens from the prototype
- **PostgreSQL 17** + **Prisma 7** (`prisma.config.ts`, `prisma-client` generator → `src/generated/prisma`, `@prisma/adapter-pg`)
- **Better Auth** (email + password with required verification, reset by email, optional Google; Prisma adapter)
- **Zod** for all input validation (shared client/server)
- **pg-boss** for background jobs (Postgres-backed, no Redis)
- **Hetzner Object Storage** (S3 API) for images, **sharp** for variants
- **next-intl** (`sq` default, `en` via cookie; no locale prefix in URLs)
- PWA: web manifest + a minimal hand-written service worker (`public/sw.js`, offline fallback only; listing data is never cached)
- **Resend** for transactional email, behind an `EmailProvider` interface (console + outbox file in dev/test)
- **Sentry** (or self-hosted GlitchTip) for errors
- **Vitest** (unit/integration) + **Playwright** (E2E, mobile viewport first)
- **Docker Compose + Caddy** on **Hetzner Cloud**

Package manager: **pnpm**. Node: LTS pinned in `.nvmrc`.

## Commands

```bash
pnpm dev               # Next dev server
pnpm worker:dev        # pg-boss worker
pnpm db:up             # docker compose up postgres (+ *_test / *_e2e databases)
pnpm db:deploy         # prisma migrate deploy
pnpm db:migrate        # prisma migrate dev: use --create-only, then strip searchVector lines (see ARCHITECTURE)
pnpm db:seed           # reference data only (categories, cities, promotion prices); safe everywhere
pnpm db:seed:demo      # DEV ONLY demo listings (every record says "DEMO")
pnpm admin:grant <email>
pnpm i18n:check        # every literal t("…") key exists in sq + en
pnpm lint              # eslint
pnpm typecheck         # tsc --noEmit
pnpm test              # vitest
pnpm test:e2e          # playwright
pnpm build             # production build
```

**Definition of done for any change:** `pnpm lint && pnpm typecheck && pnpm i18n:check && pnpm test && pnpm build` all pass (tests need Postgres). If you add a user flow, add or extend a Playwright test for it.

## Non-negotiable product rules

These come from the spec and break trust if violated. Never "temporarily" bend them.

1. **No auctions, bids, offers or price negotiation.** One fixed price per listing.
2. **48 hours, server-authoritative.** `expiresAt = publishedAt + 48h`, set once on first activation. Nothing (edits, moderation, promotions, un-marking sold) ever extends or restarts it. No automatic relisting.
3. **Expired means gone from discovery.** Every public query filters `status = ACTIVE AND expiresAt > now()`; never rely only on the worker.
4. **No fake data in production.** No fake listings, sellers, stats, counters, reviews, testimonials. Content seeds run only outside production and every record says `DEMO`.
5. **No invented discounts.** No "original price" or % badges. An optional seller-stated reference price is shown only with its source, as the seller's claim.
6. **Paid placements are always labelled** ("Sponsorizuar"), never extend validity, and only activate after verified payment or an audited admin grant. No pay button unless checkout works.
7. **A WhatsApp click is not a sale.** Never label or count it as one.
8. **Seller contact only with explicit consent.** Numbers are never rendered as text; no exact home addresses.
9. **No placeholder buttons that look functional.** If it isn't wired, don't render it.
10. **Browsing never requires an account.**
11. **No scraping or hotlinking** from MerrJep, Facebook Marketplace or any other platform.

## Engineering conventions

- **Feature-first folders.** Domain logic lives in `src/features/<domain>/`. See `docs/ARCHITECTURE.md`.
- **Server is the source of truth.** Every mutation goes through a Server Action or Route Handler that: (1) authenticates, (2) authorises (role + ownership), (3) validates with Zod, (4) rate-limits where public, (5) writes an `AuditLog` row for admin actions.
- **Never trust the client** for price, ownership, role, listing state, or promotion status.
- **Money is `Int` minor units + `currency`** (`EUR` cents, `ALL` exponent 0). No floats. Parse with `parsePriceToMinor`, format with `formatPrice` (`src/lib/money.ts`).
- **Time is UTC in the DB**, rendered in `Europe/Tirane`.
- **Listing state changes go through one function** (`transitionListing()` in `features/listings/state.ts`); pure rules live in `features/listings/rules.ts` and are unit-tested.
- **No secrets in code.** Everything through `src/env.ts` (lazy, Zod-validated `process.env`). Update `.env.example` when you add a var. Do not use `NEXT_PUBLIC_*` for deploy-time config (it is inlined at build).
- **Strings are i18n keys** (`messages/sq.json`, `messages/en.json`). Albanian first; never hardcode user-facing English.
- **Accessibility:** semantic HTML, 44×44px minimum touch targets, visible focus, `prefers-reduced-motion` and `prefers-reduced-transparency` respected.
- **Dependencies:** prefer the platform and existing deps. Adding a dependency needs a one-line reason in the PR.
- **No premature microservices.** One Next.js app + one worker process + Postgres.

## Git

- Branch from `main`: `feat/…`, `fix/…`, `chore/…` (or the branch your session was assigned).
- Conventional commits (`feat(listings): add price-drop badge`).
- Small PRs. Each PR states: what, why, how it was tested, screenshots for UI (mobile 390px first).
- Never commit `.env*` (except `.env.example`), credentials, or production data.

## When unsure

Choose the simplest option that satisfies the spec and keeps the door open. Write it down in `docs/adr/NNNN-title.md` (context → decision → consequences, ≤1 page). Record unfinished work in `docs/TODO.md`.
