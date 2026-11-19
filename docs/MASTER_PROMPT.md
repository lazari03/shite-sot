# MASTER PROMPT — SHITSHPEJT

> Product source of truth, condensed from the owner's brief of 2026-11-19 (see ADR 0001). Visual source of truth: `docs/design/prototype-v4.html`.

## 1. Product
**ShitShpejt — "Okazionet nuk presin."** A production-grade Albanian flash marketplace for secondhand and new products sold at a **fixed price** within **48 hours**. Albania first, Kosovo later. Albanian by default. **EUR** first, ALL supported in the data model. Responsive web app + installable PWA.

### Fundamental business rules
1. Listings stay active **exactly 48 hours** after publication.
2. One fixed asking price per listing.
3. **No auctions, bidding or buyer price negotiation — ever.**
4. Expired listings disappear from active discovery automatically.
5. Sellers can mark items sold before expiry.
6. Sellers can create new listings, subject to moderation and anti-spam limits.
7. Expired listings stay visible in the seller's private dashboard.
8. No automatic relisting, no endless timer extensions.
9. Paid promotion is allowed but never extends the 48-hour validity.
10. Real photographs and accurate condition descriptions only.

## 2. Architecture principles
Modular monolith, domain-oriented, strongly typed, server-side validation, minimal dependencies, reusable UI, secure by default, simple ops. No Redis, Kubernetes, Elasticsearch, microservices or event buses without a measured need. Inspect accessible repos first; never claim to have inspected inaccessible ones.

## 3. Stack
Next.js App Router + TypeScript strict + React + Tailwind; Zod; Server Actions for mutations, Route Handlers for public APIs/webhooks/integrations; service layer; Prisma + PostgreSQL; Docker Compose + Caddy; GitHub Actions; S3-compatible storage; scheduled expiry worker; transactional email behind an abstraction. Pinned versions.

## 4. Design
The prototype is the primary visual spec: dark forest-green identity, sharp lime accents, clean neutral backgrounds, high-contrast type, strong product photos, compact cards, large prices, visible 48h countdowns, sharp geometry, small radii, minimal shadows, crisp borders. More polished than the reference, still recognisable. **Forbidden:** SaaS-dashboard homepage, heavy gradients, glassmorphism everywhere, glowing buttons, big radii, needless animation, placeholder/fake stats, testimonials, transaction counts or reviews. Mobile-first and complete on every breakpoint.

## 5–6. Accounts
Registration, login, logout, password reset or passwordless, secure sessions, user + seller profile, account management and deletion, admin roles. Browsing is public. Auth required to publish, sync favourites, manage listings/promotions and use protected contact. Seller profile: display name, avatar, city, member since, active and sold listings, verification status (**only shown as verified after real verification**). Rate limiting + abuse protection.

## 7. Listings
Fields: id, seller, title, slug, description, price, currency, category, subcategory, condition, city, location description, images, status, published/expires/sold/created/updated dates, moderation status, promotion status. Precise money (no floats). Statuses: `DRAFT, PENDING_REVIEW, ACTIVE, SOLD, EXPIRED, REJECTED, REMOVED`.
Seller flow: log in → category → photos → title + description → condition → fixed price → city → preview → submit → active after moderation; **the 48h timer starts when it becomes publicly active**.
Expiry: server-authoritative UTC, `expiresAt = publishedAt + 48h`, never from the browser clock. `ACTIVE && expiresAt <= now` counts as expired everywhere. Idempotent worker reconciles; queries never depend only on it.
Edits never restart the timer; important changes may need moderation; `SOLD → ACTIVE` never extends the original expiry.

## 8–9. Discovery and detail
Home: header, logo, search, hero, CTA, category nav, featured deals, recently published, ending soon, location filter, footer — **all real DB content, intentional empty states**. Category pages: subcategories, price/condition/city filters, sorting (newest, lowest, highest, ending soon), pagination. Indexed Postgres search, debounced input, empty/loading states.
Detail: large gallery, title, fixed price, condition, category, location, time remaining, description, seller info, contact, save, share, report, related. WhatsApp contact only with the seller's explicit opt-in; never reveal numbers without consent; message generated from title + URL; contact is not a purchase; blocked for expired/sold/removed listings.

## 10. Seller dashboard
Real metrics only: active, expired, sold, views, contact clicks, favourites received (no invented conversion stats). Create, save drafts, edit, preview, mark sold, see expiry, delete where permitted, see performance. Publishing in ~30–60 s when photos are ready.

## 11. Countdown
Server-authoritative, accurate in the browser, SSR-safe with no hydration mismatch, low overhead, automatic expired state, accessible labels, no artificial extensions. Formats like `36h 20m`, `12h 05m`, `58m`, `Expired`. Progressive urgency styling, no blinking.

## 12. Categories
Telefona, Kompjuterë, Gaming, Elektronikë, Shtëpi, Mobilje, Modë, Sport, Të tjera — database-backed, admin-managed, extensible attributes later.

## 13. Pricing integrity
Seller sets the price. Optional reference price stored **with its source**. Never invent original prices, never compute fake % discounts, avoid unverified comparisons, allow reporting misleading listings. Data model ready for future market-price analysis; no AI pricing engine in the MVP.

## 14. Monetisation
Free: basic listings, 48h expiry, standard placement, dashboard. Paid (designed now): featured listing (~€1.99), homepage spotlight (~€4.99), category spotlight, professional plan (~€19/month) — **admin-configurable prices**. Payment-provider abstraction (don't assume Stripe). Promotions activate only after verified payment or an explicit admin grant. Never show a pay button unless checkout works.

## 15. Administration
Secure admin panel: metrics, users, review/approve/reject listings, remove prohibited content, categories, reports, promotions + prices, activity, errors/health. Real-query metrics: users, active/expired/sold, created today, pending moderation, reported, contact clicks, promotion revenue when available. Server-side role checks on every mutation.

## 16. Images
Multiple uploads, type + size validation, resizing, thumbnails, optimised formats, responsive delivery, safe deletion, orphan cleanup, never serve executable content, object storage (not Postgres), no hotlinking from other marketplaces.

## 17. Security
AuthN/Z, object-level access control, input validation, rate limits, upload security, CSRF, XSS, SQL injection, secure cookies, secrets, admin protection, abuse/spam, account enumeration, logs without sensitive data. A seller can never modify another's listing; expired listings can't be bought or treated as available through direct API calls; authorisation lives in server code.

## 18. Performance & SEO
Server Components, indexed queries, efficient pagination, responsive lazy images, minimal client JS, cache invalidation, connection management. Unique listing metadata, category metadata, canonical URLs, Open Graph, accurate structured data, XML sitemap, robots, semantic HTML, Albanian metadata, deliberate SEO lifecycle for expired/removed listings, no private data or drafts exposed.

## 19. Analytics
Privacy-conscious first-party events: impressions, detail views, searches, category views, contact clicks, favourites, submissions, activations, expirations, sold confirmations, promotion purchases. Traffic ≠ transactions. Don't count every refresh.

## 20. Testing
Unit: expiry, transitions, price validation, promotion eligibility, authz helpers. Integration: publication, moderation, filtering, upload validation, expiry reconciliation, contact eligibility. E2E: register → draft → upload → submit → approve → public → countdown accurate → buyer opens → contacts → seller marks sold → gone from discovery; natural expiry via controlled clocks. Typecheck, lint, tests and build must pass.

## 21. DevOps
Multi-stage Dockerfile, optimised non-root image, health checks, env config, restart policies, persistent Postgres volume, image storage config, scheduled worker. GitHub Actions: install, lint, typecheck, tests, build, Docker image, deploy, health verification; secrets in repo secrets; safe pruning of old images. Ubuntu + Docker Compose + Caddy + HTTPS + Postgres + external object storage. No destructive migration or production deploy without verifying the target. Documented rollback and backups.

## 22–25. Phases, DoD, execution, delivery
Foundation → Marketplace → Selling → Buyer experience → Administration → Monetisation foundation → Production readiness. Done = users register/authenticate, sellers publish real listings with photos, discovery/search/filters work, fixed prices, 48h lifecycle enforced, buyers contact sellers, sellers mark sold, admins moderate, expired excluded, responsive, faithful to the prototype, persistent data, security checks, tests + build pass, documented deploy. No mock API responses or fabricated stats in production. Never claim a deployment, payment or test succeeded unless it did.
