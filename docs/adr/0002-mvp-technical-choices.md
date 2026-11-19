# ADR 0002 — MVP technical choices

**Date:** 2026-11-19 · **Status:** accepted

| Topic | Decision | Why / trade-off |
|---|---|---|
| Expiry | `expiresAt = publishedAt + 48h` set once by the server on first activation, in `transitionListing()`. Every public query also filters `expiresAt > now()`; the worker only reconciles status (idempotent, every minute). | Correct even if the worker is down. DB `CHECK` forbids `ACTIVE` without a deadline. |
| Edits | Never touch `publishedAt/expiresAt`. Live price may only go down (recorded in `PriceHistory`). Material edits by non-trusted sellers → `PENDING_REVIEW` while the original clock keeps running. | Prevents timer resets and bait-and-switch. |
| Moderation | `MODERATION_MODE=first_n` (default): a seller's listings are pre-moderated until `MODERATION_TRUST_AFTER` have been approved; admins can mark sellers trusted. | Spam/scam control without blocking good sellers forever. |
| Auth | Better Auth, email + password with **required email verification**, password reset by email, optional Google. | Verification enables Better Auth's sign-up enumeration protection and blocks throwaway-email spam. Magic links can be added later. |
| i18n | next-intl **without locale prefixes**; `sq` default, `en` via cookie switcher. | Clean Albanian URLs (`/p/…`, `/kategori/…`). Trade-off: no `hreflang` alternates for English. |
| UI kit | Small in-house primitives ported from the prototype CSS (Tailwind v4 `@theme` + a few component classes). No shadcn/Radix/Motion/React Hook Form yet. | The prototype already defines the components; fewer deps. Native `<dialog>` for modals, `useActionState` + shared Zod schemas for forms. |
| Images | Upload through our route handler → sharp decodes (rejects non-images/SVG), auto-rotates, strips metadata, stores WebP 320/640/1280. `StorageProvider` with `local` (dev/single node) and `s3` (Hetzner Object Storage) drivers. | Server-side validation instead of trusting presigned uploads. Originals aren't kept. |
| Rate limiting | Fixed-window counters in Postgres (`RateLimit` table) + Better Auth's limiter on auth endpoints. | No Redis. Good enough for one web node. |
| Search | Postgres FTS (`simple` + `unaccent`) + `ILIKE`/`pg_trgm` fallback, GIN indexes. Offset pagination capped at 500 pages. | No search service until p95 says so. Keyset pagination is a later optimisation. |
| Payments | `PaymentProvider` interface, no provider wired (`paymentProvider()` returns `null`). Promotions activate only on a verified webhook (idempotent by `providerRef`) or an audited admin grant. No pay buttons rendered. | Don't assume Stripe works for an Albanian business; never fake payments. |
| Analytics | First-party `AnalyticsEvent` table, daily-salted visitor hash (no IPs stored), dedupe keys (one view/contact per visitor/listing/day). | Privacy-conscious, no third-party script. Contact clicks are labelled traffic, never sales. |
| Caching | Pages render dynamically (session-aware header, live deadlines). | Simpler and always fresh. Revisit with `cacheComponents`/ISR when traffic grows. |
| Runtime config | Nothing reads `NEXT_PUBLIC_*`; `SITE_URL`, CSP image host etc. are read at runtime (`src/env.ts`, `src/proxy.ts`). Prisma client is created lazily. | One image promoted staging → production; `next build` needs no secrets. |
