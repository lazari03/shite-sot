---
name: shitesot-backend
description: ShiteSot backend conventions. Use when touching the Prisma schema or migrations, Server Actions, Route Handlers, authentication/authorization (Better Auth, roles), Zod validation, Postgres search, background jobs (pg-boss), image uploads/S3, CSV/Excel imports, price history, listing state transitions, notifications, payments/webhooks, rate limiting or audit logs.
---

# ShiteSot Backend

Read `docs/ARCHITECTURE.md` for the data model and job list. This skill covers **how** to write the code.

## 1. Feature module shape

```
src/features/listings/
├── schema.ts      # Zod: CreateListingInput, UpdatePriceInput … (shared client+server)
├── queries.ts     # import "server-only"; read functions returning view models
├── actions.ts     # "use server"; thin: auth → validate → service → revalidate
├── service.ts     # business rules; pure-ish, takes a Prisma tx; used by actions AND worker
├── state.ts       # transitionListing(): the ONLY way to change Listing.status
└── components/
```

## 2. Server Action template

```ts
"use server";
import { action } from "@/server/action";           // wraps: session, rate limit, zod, error mapping
import { UpdatePriceInput } from "./schema";
import { changePrice } from "./service";

export const updatePrice = action
  .input(UpdatePriceInput)
  .rateLimit("listing:update", { points: 30, duration: 60 })
  .auth({ role: "SELLER" })
  .run(async ({ input, user, db }) => {
    await requireListingOwner(db, input.listingId, user.id);
    const listing = await db.$transaction((tx) => changePrice(tx, input.listingId, input.priceLek));
    revalidateTag(`listing:${listing.id}`);
    return { ok: true as const, priceLek: listing.priceLek };
  });
```

Build `src/server/action.ts` once (small builder; or use `next-safe-action`). Every action returns `{ ok: true, … } | { ok: false, code, message }`. Never throw raw errors to the client. Map Zod errors to field errors with Albanian messages.

## 3. Auth & RBAC

- Better Auth with Prisma adapter, magic-link email + Google. Session read in RSC via `getSession()` (cached per request).
- `requireUser()`, `requireRole("ADMIN")`, `requireListingOwner(db, listingId, userId)` in `src/server/authz.ts`.
- Role escalation (BUYER→SELLER) happens server-side on first listing publish. `ADMIN` is only granted via a CLI script (`pnpm admin:grant <email>`), never through the UI.
- Admin routes: check in the layout **and** in every action (layouts don't protect actions).

## 4. Listing state machine

```
DRAFT ─► PENDING_REVIEW ─► ACTIVE ⇄ RESERVED ─► SOLD
              │               │  └──────────────► EXPIRED ─► ACTIVE (seller re-confirms)
              └──► REMOVED ◄──┘ (moderation)
```
`transitionListing(tx, id, to, { actor, reason })` validates the edge, sets timestamps (`publishedAt`, `soldAt`), writes `PriceHistory` on first publish, enqueues `alerts.match` on publish, and writes `AuditLog` when the actor is an admin. Unit-test every edge, including the illegal ones.

New sellers' first 3 listings → `PENDING_REVIEW`. Trusted / verified sellers → `ACTIVE` directly.

## 5. Price history & drops

- `changePrice()` inserts a `PriceHistory` row in the same transaction as the update.
- `isPriceDrop = latest.priceLek < previous.priceLek` using the **two most recent rows only**. Display the drop vs the previous price, not vs the max ever (prevents inflate-then-drop gaming).
- Anti-gaming: if a price is raised then dropped within 7 days, show no drop badge. Unit-test it.
- On a real drop: enqueue `alerts.priceDrop` for users who saved the listing.

## 6. Search

- Migration adds `CREATE EXTENSION unaccent; CREATE EXTENSION pg_trgm;` + an `immutable_unaccent()` wrapper + the generated `searchVector` column + GIN indexes (Prisma `Unsupported("tsvector")` + raw SQL in the migration).
- Query via `$queryRaw` tagged template only:
  `websearch_to_tsquery('simple', immutable_unaccent(${q}))` OR `title % ${q}` (trigram), filtered by status `ACTIVE`, category, city, price range, condition, `urgentUntil > now()`, has-drop.
- Pagination: keyset (`publishedAt, id`), never `OFFSET` beyond page 1.
- Log every search (query hash, filters, result count) to an `SearchLog` table for the admin "search activity" + zero-result insights.

## 7. Uploads

1. Client asks `POST /api/uploads` → server checks auth + rate limit and returns a presigned S3 PUT (key `u/<userId>/<cuid>.<ext>`, `Content-Type` image/jpeg|png|webp|heic, max 10 MB).
2. Client PUTs directly to Hetzner Object Storage.
3. Client sends keys with the listing form; server verifies the key prefix belongs to the user, enqueues `image.process`.
4. Worker: sharp → rotate, strip EXIF/GPS, AVIF + WebP at 320/640/1080/1600, blurhash, write dims to `ListingImage`.
5. Serve via a custom `next/image` loader pointing at the bucket's public URL (or a Caddy-cached path).

## 8. Imports (CSV / XLSX)

- Parse with `papaparse` (CSV) and `exceljs` (XLSX) **in the worker**, streaming, max 5 000 rows / 20 MB per file.
- Auto-detect columns by header synonyms (sq + en: `titulli|title|name`, `cmimi|çmimi|price`, `id|sku|external_id`…), and persist the seller's mapping for reuse.
- Each row → Zod `ImportRowSchema` → `ImportRow` with errors. Preview shows valid/invalid counts before publish.
- Upsert by `ExternalRef(sellerId, source, externalId)`. A price change goes through `changePrice()` so drops stay honest. A missing `externalId` falls back to a hash of (title + price + first image URL) for duplicate detection.
- Images from URLs: fetch through an allowlist + SSRF guard (block private IPs), size/type checks, then the normal image pipeline.

## 9. Jobs (pg-boss)

- `src/server/jobs/index.ts` exports typed `enqueue<"image.process">(payload)`; `src/worker/index.ts` registers handlers.
- Every handler is **idempotent** (use `singletonKey` / natural keys) and safe to retry. Payloads hold IDs, not objects.
- Cron jobs are registered with `boss.schedule()` in `Europe/Tirane` tz.

## 10. Payments (phase 3, design now)

- `PaymentProvider` interface: `createCheckout()`, `verifyWebhook(req)`, `parseEvent()`. Implementations per provider (research Albanian-supported providers first; **don't assume Stripe**).
- `Payment.idempotencyKey` unique; the webhook handler upserts by `providerRef` inside a transaction and activates the `Promotion` only on a confirmed status. Replaying the same webhook N times = one activation (test it).
- No stored-value wallet. Prepaid boost bundles are credits tied to promotions, not money.

## 11. Rate limits & abuse

`rate-limiter-flexible` with `RateLimiterPostgres`. Defaults: auth 5/min/IP, create listing 10/h/user, upload 60/h/user, contact click 30/h/IP, report 10/h/user, search 120/min/IP. Honeypot field + timing check on public forms. Flag sellers whose price changes > 5×/day or who post near-duplicate titles.

## 12. Testing

- **Vitest** with a real Postgres (Testcontainers or the compose DB with a per-run schema). Don't mock Prisma for service tests.
- Required coverage (from spec §21): auth, listing create/edit, upload validation, search filters, seller permissions, import validation, duplicate prevention, sold/expired states, price-drop calc, promotion expiry, webhook idempotency, rate limits.
- Factories in `tests/factories.ts`, never shared mutable fixtures.

## 13. Don'ts

- ❌ Business logic in route files or components
- ❌ `prisma` imported in client components (enforce with `server-only`)
- ❌ Raw SQL string concatenation
- ❌ Floats for money
- ❌ Changing `Listing.status` or `priceLek` outside `state.ts` / `changePrice()`
- ❌ Counting WhatsApp clicks as sales
