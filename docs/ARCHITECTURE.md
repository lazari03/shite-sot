# ShiteSot — Architecture

**Principle:** one deployable Next.js app + one worker + Postgres. Modular by feature so any module can be extracted later, but nothing is extracted until traffic proves it's needed.

```
             ┌──────────── Hetzner Cloud VM (Docker Compose) ────────────┐
 Browser/PWA │  Caddy (TLS, HTTP/3, gzip/zstd)                            │
  ─────────► │     │                                                      │
             │     ▼                                                      │
             │  web: Next.js standalone ──► Postgres 17 (+unaccent,pg_trgm)│
             │     │   RSC / Server Actions        ▲                      │
             │     │                               │ pg-boss queue        │
             │     └──► worker: pg-boss jobs ──────┘                      │
             └─────┬───────────────────────────────────────────────┬────┘
                   ▼                                               ▼
        Hetzner Object Storage (S3)                 Resend · Sentry · Google OAuth
        images: original + AVIF/WebP variants
```

## Layers

| Layer | Lives in | Rules |
|---|---|---|
| Routes / pages | `src/app/` | Thin. Fetch via `features/*/queries.ts`, render `features/*/components`. |
| UI primitives | `src/ui/` | Design system: Glass, Button, Sheet, TabBar, PriceTag, Badge… No data fetching. |
| Features | `src/features/<domain>/` | `schema.ts` (Zod) · `queries.ts` (reads, `server-only`) · `actions.ts` (Server Actions) · `service.ts` (business rules) · `components/` |
| Server infra | `src/server/` | `db.ts`, `auth.ts`, `storage.ts`, `email/`, `jobs/`, `rate-limit.ts`, `audit.ts`, `search.ts` |
| Worker | `src/worker/index.ts` | Registers pg-boss handlers. Reuses `features/*/service.ts`. |
| Shared | `src/lib/` | Pure helpers: money, dates, slugs, i18n formatters. |

**Dependency direction:** `app → features → server → lib`. `ui` is imported by `app` and `features` only. Features don't import each other's internals; they go through `service.ts` exports.

## Folder structure

```
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                 # DEV ONLY, records tagged DEMO
├── prisma.config.ts
├── messages/{sq,en}.json
├── public/                     # icons, manifest assets
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (shell)/        # pages with bottom TabBar
│   │   │   │   ├── page.tsx                 # Kryefaqja
│   │   │   │   ├── kerko/page.tsx           # Search
│   │   │   │   ├── ruajtur/page.tsx         # Saved
│   │   │   │   ├── profili/page.tsx
│   │   │   │   ├── k/[category]/page.tsx    # category landing
│   │   │   │   └── q/[city]/page.tsx        # city landing
│   │   │   ├── p/[slug]/page.tsx            # listing detail (SSR, SEO)
│   │   │   ├── s/[seller]/page.tsx          # seller profile
│   │   │   ├── shit/                        # create listing flow (fullscreen, no tabbar)
│   │   │   ├── paneli/                      # seller dashboard + imports
│   │   │   └── admin/                       # RBAC: ADMIN
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts       # Better Auth
│   │   │   ├── uploads/route.ts             # presigned S3 URLs
│   │   │   └── webhooks/[provider]/route.ts # payments (phase 3)
│   │   ├── sitemap.ts · robots.ts · manifest.ts
│   │   └── sw.ts                            # Serwist
│   ├── features/
│   │   ├── listings/  search/  sellers/  saved/  alerts/
│   │   ├── imports/   pricing/  promotions/  payments/
│   │   ├── moderation/  analytics/  notifications/
│   ├── server/
│   ├── worker/
│   ├── ui/
│   ├── lib/
│   ├── env.ts
│   └── styles/globals.css     # Tailwind v4 @theme tokens + glass utilities
├── tests/e2e/
├── docker/ (Dockerfile, Caddyfile)
├── compose.yaml · compose.prod.yaml
└── docs/ (ARCHITECTURE, BRAND, DEPLOYMENT, adr/, TODO)
```

## Data model (core)

All IDs are `cuid2` strings. All tables have `createdAt` and `updatedAt`. Money is `Int` (lek).

| Model | Key fields | Notes |
|---|---|---|
| `User` | email, name, image, role `BUYER\|SELLER\|ADMIN` (default BUYER; becomes SELLER on first listing), phoneVerifiedAt, deletedAt | + Better Auth `Account`, `Session`, `Verification` |
| `SellerProfile` | userId (1:1), type `INDIVIDUAL\|PROFESSIONAL`, displayName, slug, cityId, whatsapp (E.164), contactConsent bool, verifiedAt | contact shown only if `contactConsent` |
| `Category` | parentId, slug, nameSq, nameEn, specSchema (JSON, Zod-compatible), sort, active | tree, 2 levels |
| `City` | slug, name, lat, lng, active | Tirana, Shkodër first |
| `Listing` | sellerId, categoryId, cityId, title, description, priceLek, condition `NEW\|USED`, status, specs JSON, slug, publishedAt, urgentUntil?, lastConfirmedAt, soldAt, searchVector (tsvector, generated) | |
| `ListingStatus` | `DRAFT PENDING_REVIEW ACTIVE RESERVED SOLD EXPIRED REMOVED` | transitions only via `transitionListing()` |
| `ListingImage` | listingId, key, width, height, blurhash, position | variants derived from key |
| `PriceHistory` | listingId, priceLek, changedAt | row on publish + every price change; drop = latest < previous |
| `SavedListing` | userId, listingId (unique pair) | |
| `SavedSearch` | userId, query, filters JSON, frequency `INSTANT\|DAILY\|OFF`, lastNotifiedAt | |
| `Notification` | userId, type, payload JSON, readAt, channel | in-app + email |
| `ContactClick` | listingId, userId?, sessionHash, channel, createdAt | a click is **not** a sale |
| `ListingStatDaily` | listingId, date, views, contactClicks, saves | aggregated by worker |
| `Report` | listingId/userId, reporterId, reason, status, resolvedById | moderation queue |
| `ImportJob` | sellerId, source `CSV\|XLSX\|XML\|WOOCOMMERCE`, status, mapping JSON, stats JSON | |
| `ImportRow` | jobId, rowNumber, externalId, raw JSON, errors JSON, listingId? | |
| `ExternalRef` | sellerId, source, externalId, listingId | `@@unique([sellerId, source, externalId])` stops duplicate imports |
| `PromotionProduct` | code, nameSq, priceLek, durationHours, active | admin-configurable pricing |
| `Promotion` | listingId, productId, startsAt, endsAt, paymentId? | phase 3 |
| `Payment` | userId, provider, providerRef (unique), amountLek, status, idempotencyKey (unique), raw JSON | provider-agnostic |
| `AuditLog` | actorId, action, entity, entityId, before JSON, after JSON, ip | every admin mutation |

### Indexes that matter

- `Listing`: `GIN(searchVector)`, `GIN(title gin_trgm_ops)`, `(status, publishedAt DESC)`, `(status, categoryId, cityId, publishedAt DESC)`, `(status, priceLek)`, `(sellerId, status)`, partial `(urgentUntil) WHERE urgentUntil IS NOT NULL`
- `PriceHistory`: `(listingId, changedAt DESC)`
- `SavedSearch`: `(frequency, lastNotifiedAt)`
- `ContactClick` / `ListingStatDaily`: `(listingId, date)`

## Search

Postgres full-text search with **`unaccent` + `simple` config** (Postgres has no Albanian stemmer) plus **`pg_trgm`** for typos and partial matches. Searching `celular` finds `çelular`, and `iphon` finds `iPhone`.

```sql
searchVector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(title,''))), 'A') ||
  setweight(to_tsvector('simple', immutable_unaccent(coalesce(description,''))), 'C')
) STORED
```

Ranking: `ts_rank` × freshness decay × (1 + small promotion boost, capped). Promoted results are labelled and limited to fixed slots. Move to Meilisearch/Typesense only when p95 search exceeds 150ms at real traffic.

## Background jobs (pg-boss)

| Job | Schedule | Does |
|---|---|---|
| `image.process` | on upload | sharp → AVIF + WebP at 320/640/1080/1600, blurhash |
| `alerts.match` | on listing publish / price drop | match `SavedSearch` with `INSTANT` frequency |
| `alerts.digest` | daily 08:00 Europe/Tirane | DAILY digest emails |
| `listings.expireUrgent` | every 5 min | clear `urgentUntil` past deadline (never reset) |
| `listings.staleCheck` | daily | ask sellers to confirm availability after 21 days; expire after 30 more without reply |
| `promotions.expire` | every 5 min | end promotions at `endsAt` |
| `imports.run` | on demand | parse → validate → upsert via `ExternalRef` |
| `stats.rollup` | hourly | aggregate views/clicks into `ListingStatDaily` |

All handlers are idempotent.

## Rendering & caching

- Listing detail, category and city pages: **server-rendered**, cached with `revalidateTag("listing:<id>")` on change. Full SEO metadata, JSON-LD `Product` + `Offer`, OG image from the first photo.
- Search results: dynamic RSC. `noindex` for filter combinations that aren't whitelisted landing pages.
- Sold listings: keep the page with a **"Shitur"** state and similar items for 30 days, then return **410**. Expired listings: `noindex`.
- Client components only where interaction requires them (sheets, galleries, forms).

## Security

- Better Auth sessions (httpOnly, secure, SameSite=Lax). RBAC helper `requireRole()`, ownership helper `requireListingOwner()`.
- Zod on every input. Prisma only, no raw SQL string interpolation (`$queryRaw` with tagged templates only).
- Rate limits (Postgres-backed, `rate-limiter-flexible`): auth, listing create, contact click, report, upload, search.
- Uploads: presigned PUT with content-type + size limit (10 MB), server re-validates with sharp, strips EXIF/GPS.
- Strict CSP via middleware nonce, HSTS, `X-Content-Type-Options`, `Referrer-Policy`.
- Audit log for every admin action. Account deletion = soft delete + PII scrub job.

## Environments

`development` (local Docker: Postgres, MinIO, Mailpit) → `staging` (small Hetzner VM, separate DB and bucket) → `production`. Config only via env, validated in `src/env.ts`. See `.agents/skills/shitesot-deploy-hetzner/SKILL.md`.

## Build order (MVP)

1. Scaffold, env, design tokens, app shell (TabBar, glass chrome), i18n
2. Prisma schema + migrations + auth
3. Seller profile + create-listing flow + image upload pipeline
4. Listing detail (SEO, share, WhatsApp contact)
5. Search + filters + home sections (new, price drops)
6. Saved listings + price history / drop badges
7. Seller dashboard + CSV/XLSX import
8. Admin: moderation queue, reports, audit log, metrics
9. Analytics events, sitemap, OG images
10. PWA (manifest, Serwist, install prompt)

Phase 2+ (alerts, urgent sales, payments, WooCommerce) per `docs/MASTER_PROMPT.md` §20.
