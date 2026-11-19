# ShitShpejt — Architecture

**Principle:** one Next.js app + one worker process + Postgres. Modular by domain so pieces can be extracted later; nothing is extracted until traffic proves it's needed. Key decisions: `docs/adr/`.

```
             ┌──────────── Hetzner Cloud VM (Docker Compose) ─────────────┐
 Browser/PWA │  Caddy (TLS, HTTP/3, zstd/gzip)                             │
  ─────────► │     │                                                       │
             │     ▼                                                       │
             │  web: Next.js standalone ───► Postgres 17 (unaccent, pg_trgm)│
             │     │  RSC / Server Actions        ▲                        │
             │     │  /api/* route handlers       │ pg-boss schedules      │
             │  worker: pg-boss (same image) ─────┘                        │
             │  migrate: prisma migrate deploy + reference seed (one-shot) │
             └─────┬───────────────────────────────────────────────┬──────┘
                   ▼                                               ▼
     Hetzner Object Storage (S3) — WebP variants        Resend (email) · Google OAuth (optional)
```

## Layers

| Layer | Lives in | Rules |
|---|---|---|
| Routes | `src/app/` | Thin. Auth gate → call feature queries → render. |
| UI primitives | `src/ui/` | Card, countdown, header/shell, tab bar, drawer, buttons. No data fetching (except the `Shell`, which reads session + categories). |
| Features | `src/features/<domain>/` | `schema.ts` (Zod, shared client/server) · `rules.ts` (pure business rules, unit-tested) · `queries.ts` (reads, `server-only`) · `service.ts` (writes, transactions) · `actions.ts` (Server Actions: auth → rate limit → validate → service) · `components/` |
| Server infra | `src/server/` | `db` (lazy Prisma 7 + pg adapter), `auth` (Better Auth), `authz` (`requireUser/Admin`, object-level checks), `rate-limit`, `audit`, `storage` (local/S3), `email` (console/Resend), `http` (same-origin + error mapping), `logger` (redacting JSON logs) |
| Worker | `src/worker/index.ts` | pg-boss cron jobs reusing feature services. |
| Shared | `src/lib/` | money, time/countdown, slug, phone. Pure. |
| Config | `src/env.ts` | The only reader of `process.env` (except `proxy.ts`). Lazy Zod validation. |

Dependency direction: `app → features → server → lib`. Features talk to each other through exported services/rules.

## Domains

| Domain | Highlights |
|---|---|
| `listings` | `rules.ts` (state table, `effectiveStatus`, activation, edit classification, contact eligibility) · `state.ts` **`transitionListing()` — the only writer of `Listing.status`** (conditional update guards races, writes timestamps, price history, analytics events, audit for admin actions, ends promotions on leaving ACTIVE) · `service.ts` (create/update/submit/sold/withdraw/delete/moderate/expire) · `queries.ts` (FTS discovery, home sections, detail) |
| `media` | Upload pipeline (sharp → WebP 320/640/1280, EXIF stripped), orphan cleanup |
| `auth` | Pure policy (`canManageListing`, `isListingOwner`, `needsModeration`), auth client + forms |
| `catalog` | Category tree, cities (DB-backed, admin-managed) |
| `favorites`, `reports`, `sellers`, `dashboard`, `account` | Buyer/seller features |
| `promotions` | Eligibility rules (never beyond `expiresAt`), audited admin grants, idempotent payment activation, `PaymentProvider` boundary |
| `admin` | Moderation, reports, users (ban/verify/trust), categories, promotion prices, audit log, health |
| `analytics` | First-party events with daily-salted visitor hash + dedupe keys |

## Listing lifecycle

```
          submit (needs review)          approve (first time: publishedAt=now, expiresAt=+48h)
 DRAFT ───────────────────────► PENDING_REVIEW ─────────────────────────────► ACTIVE ──mark_sold──► SOLD
   ▲  │ submit (trusted) ──────────────────────────────────────────────────────▲  │  ▲                │
   │  │                          │ reject            material_edit (clock runs) │  │  └──unmark_sold───┘
   │  │                          ▼                   ◄──────────────────────────┘  │   (only while expiresAt > now)
   └──┴── withdraw ◄──────── REJECTED ── resubmit ──►                              │ expire (worker, idempotent)
                                                                                   ▼
                     any (admin) ──remove──► REMOVED                            EXPIRED (frozen, no relisting)
```

Public = `status = ACTIVE AND expiresAt > now() AND seller not banned/deleted`, applied in every query, so correctness never depends on the worker.

## Data model (Prisma, `prisma/schema.prisma`)

`User` (Better Auth core + role, city, bio, whatsapp, contactConsent, verifiedAt, trusted, proUntil, bannedAt, deletedAt) · `Session/Account/Verification` · `Category` (2-level tree, `attributes` JSON reserved) · `City` (country for Kosovo expansion) · `Listing` (priceMinor + currency, reference price + source, lifecycle timestamps, moderation fields, denormalised view/contact/favourite counters, generated `searchVector`) · `ListingImage` · `PriceHistory` (baseline for future market-price analysis) · `Favorite` · `Report` · `PromotionProduct` (admin prices) · `Promotion` · `Payment` (idempotencyKey, providerRef unique) · `AnalyticsEvent` (dedupeKey unique) · `AuditLog` · `RateLimit` · `Heartbeat`.

DB guard rails: `CHECK (priceMinor > 0)`, `CHECK (status <> 'ACTIVE' OR (publishedAt IS NOT NULL AND expiresAt IS NOT NULL))`. Indexes: `(status, expiresAt)`, `(status, publishedAt DESC)`, `(status, categoryId, expiresAt)`, `(status, cityId, expiresAt)`, `(status, priceMinor)`, `(sellerId, status)`, GIN on `searchVector` and `unaccent(title)` trigrams.

> **Migration gotcha:** `searchVector` is a generated column Prisma can't model. `prisma migrate dev` will try to drop/alter it; create migrations with `--create-only` and delete those lines (see `prisma/migrations/20261119030000_heartbeat` for the pattern).

## Jobs (`src/worker`)

| Job | Schedule (Europe/Tirane) | Does |
|---|---|---|
| `listings.expire` | every minute (+ on boot) | `ACTIVE && expiresAt <= now` → `EXPIRED` via `transitionListing` |
| `promotions.expire` | every 5 min | end promotions past `endsAt` |
| `images.cleanup` | hourly | delete uploads never attached after 24 h |
| `ratelimit.cleanup` | daily | prune old counters |

Every handler is idempotent and writes a `Heartbeat` row shown on `/admin/shendeti`.

## Routes

Public: `/` · `/kerko` · `/kategori/[slug]` · `/p/[slug]` · `/shitesi/[id]` · `/ruajtura` (login to sync) · auth pages (`/hyr`, `/regjistrohu`, `/harrova-fjalekalimin`, `/rivendos-fjalekalimin`).
Seller: `/shit` · `/paneli` · `/paneli/njoftimet/[id]` (preview/manage) · `/paneli/njoftimet/[id]/ndrysho` · `/llogaria`.
Admin: `/admin` (+ `moderimi`, `raportet`, `perdoruesit`, `kategorite`, `promovimet`, `auditimi`, `shendeti`).
API: `/api/auth/*` (Better Auth) · `POST /api/uploads` · `POST /api/account/avatar` · `POST /api/contact/[id]` (eligibility re-check → 303 to WhatsApp) · `GET /api/media/*` (local driver only) · `GET /api/health`.

## SEO lifecycle

ACTIVE → indexable, `Product`/`Offer` JSON-LD (InStock), in sitemap. SOLD/EXPIRED → reachable for 30 days with a clear state + similar deals, `noindex, follow`, removed from sitemap; then 404. DRAFT/PENDING/REJECTED/REMOVED → 404 for everyone except owner/admin. Search pages and filtered category pages are `noindex`. `robots.txt` disallows everything outside production.
