# TODO

## External setup (owner)

- [ ] Domain (e.g. `shitshpejt.al`) + DNS → Hetzner VM; staging subdomain
- [ ] Hetzner: staging + production VMs, Cloud Firewall, Object Storage buckets (media ×2, backups), S3 keys
- [ ] GitHub Environments `staging` / `production` with `DEPLOY_*` secrets and `PUBLIC_URL` variable (see `docs/DEPLOYMENT.md`)
- [ ] Resend account + domain DKIM/SPF/DMARC (`EMAIL_PROVIDER=resend`)
- [ ] Google OAuth client (optional; button appears when `GOOGLE_CLIENT_ID/SECRET` are set)
- [ ] Sentry or GlitchTip project (DSN)
- [ ] Choose a payment provider that works for an Albanian business (bank gateway / Paysera / …) — then implement `PaymentProvider`
- [ ] Terms of use + privacy policy (sq/en), reviewed against Albanian data-protection law; link them from registration and the footer
- [ ] Decide moderation staffing (default: first 3 listings per seller are pre-moderated)

## Deferred engineering work

- [ ] **Payments**: implement a `PaymentProvider`, `/api/webhooks/[provider]` route calling `activatePromotionForPayment`, checkout button on the listing manage page (only when `paymentsEnabled()`), PRO plan billing (`proUntil`)
- [ ] **Listing impressions** analytics (IntersectionObserver beacon, batched, deduped). Views, searches, category views, contacts, favourites, lifecycle events are already tracked
- [ ] Sentry/GlitchTip integration in `src/server/logger.ts` + `error.tsx`
- [ ] CSP nonces (drop `'unsafe-inline'` for scripts)
- [ ] Keyset pagination for deep result pages; caching (`cacheComponents`/ISR) for public pages once traffic grows
- [ ] Docker image: bundle worker deps (or `pnpm deploy`) to shrink the ops layer further (currently ~1.27 GB total)
- [ ] Anonymous favourites (localStorage) merged into the account on login
- [ ] Seller phone verification (SMS/WhatsApp OTP) as a trust signal; still never auto-mark "verified"
- [ ] Category-specific attributes (`Category.attributes` JSON is reserved) — e.g. storage/battery for phones
- [ ] Market-price analysis using `PriceHistory` + sold listings (no AI pricing engine before there is data)
- [ ] Kosovo launch: activate XK cities, `ALL`/`EUR` per market, `hreflang` if locale routes are added
- [ ] Image moderation assist (NSFW/duplicate detection)
- [ ] Saved searches / alerts (from the old ShiteSot spec) — only if the product wants them (needs an ADR)
- [ ] Legal pages + cookie notice (no third-party cookies are used today)
- [ ] Prisma: `searchVector` generated column causes drift in `migrate dev` — always `--create-only` and strip those lines
