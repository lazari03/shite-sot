# TODO

## External setup (owner: Fonsi)

- [ ] Register domain (`shitesot.al` or similar) and point DNS to the Hetzner VM
- [ ] Hetzner Cloud project: staging + production VMs, Cloud Firewall, Object Storage buckets (media ×2, backups), S3 keys
- [ ] Google OAuth client (consent screen in sq + en)
- [ ] Resend (or Postmark) account + domain DKIM/SPF/DMARC
- [ ] Sentry/GlitchTip project
- [ ] GitHub Environments `staging` / `production` with secrets + required reviewer on production
- [ ] Research Albanian-supported payment providers before phase 3 (don't assume Stripe)
- [ ] Privacy policy + terms (sq/en) reviewed against Albanian data-protection law

## MVP build (see docs/ARCHITECTURE.md → Build order)

- [ ] 1. Scaffold Next.js + pnpm + Tailwind v4 tokens + fonts + app shell + i18n
- [ ] 2. Prisma schema + migrations + Better Auth
- [ ] 3. Seller profile + create listing + image pipeline
- [ ] 4. Listing detail (SEO, share, WhatsApp)
- [ ] 5. Search + filters + home sections
- [ ] 6. Saved listings + price history / drop badges
- [ ] 7. Seller dashboard + CSV/XLSX import
- [ ] 8. Admin: moderation, reports, audit log, metrics
- [ ] 9. Analytics, sitemap, OG images
- [ ] 10. PWA (manifest, Serwist, install prompt)
- [ ] Docker, compose, Caddy, CI/CD, first staging deploy
