# Security review — MVP (2026-11-19)

Status per area. "Tested" = covered by automated tests in `tests/`.

| Area | Implementation | Status |
|---|---|---|
| Authentication | Better Auth email+password, scrypt hashes, required email verification, reset tokens 1 h, sessions revoked on reset, httpOnly cookies, `Secure` in staging/prod, optional Google OAuth | Done (E2E covers register + verify) |
| Account enumeration | Verification-required sign-up returns the same response for existing emails; password-reset request always shows the same message | Done |
| Authorisation | `requireUser/requireAdmin` in every action and route handler (not just layouts). Object-level: `isListingOwner/canManageListing` in services. Admin role only via CLI (`admin:grant`). Banned/deleted users can't hold sessions | Tested (cross-seller edit/submit/delete/sold, admin-can't-act-as-seller, non-admin moderation) |
| Listing integrity | Single `transitionListing()` with conditional updates; DB CHECK constraints; expired/sold/removed listings refused for contact, sold, edits; price only down while live; no relisting | Tested |
| Direct API abuse | `/api/contact/[id]` re-checks eligibility server-side; same-origin check on POST route handlers; Server Actions have built-in origin checks | Tested (E2E: sold/expired listing returns no WhatsApp redirect; cross-site POST → 403) |
| Input validation | Zod at every boundary (actions, routes, search params with safe fallbacks) | Tested |
| SQL injection | Prisma + tagged `$queryRaw`/`Prisma.sql` only; LIKE wildcards escaped | Tested (injection string in search) |
| XSS | React escaping; JSON-LD serialised with `<` escaped; no `dangerouslySetInnerHTML` elsewhere; user text rendered as text | Reviewed |
| CSP & headers | Runtime CSP in `src/proxy.ts` (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, form-action limited), HSTS in staging/prod, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` | Done. **Gap:** `script-src 'unsafe-inline'` (Next inline bootstrap). Move to nonces when adopting dynamic nonce rendering |
| Uploads | Auth + rate limit + size limits (content-length and file). Images decoded by sharp (magic bytes, not MIME); SVG/HTML refused; pixel bomb limit; re-encoded to WebP, metadata (EXIF/GPS) stripped; keys are server-generated; served with `image/webp`, `nosniff`, `Content-Disposition: inline`, sandbox CSP | Tested |
| Rate limiting / spam | Postgres fixed windows: create 10/h, submit 20/day, update 60/h, upload 80/h, contact 30/h, report 10/h, favourites 120/h, search 120/min; Better Auth limits on sign-in/up/reset; honeypot on reports; pre-moderation for new sellers; verified email required | Tested (limiter) |
| Privacy | WhatsApp numbers never rendered; contact only with explicit consent; location = city + optional approximate area (UI warns against addresses); analytics store a daily-salted hash, never IPs; account deletion scrubs PII and unpublishes listings | Tested (deletion) |
| Logging | Structured logs with redaction of password/token/cookie/email/phone keys; errors to clients are stable codes only | Done |
| Secrets | Only via env, validated in `src/env.ts`; production refuses `dev-` auth secrets; `.env*` git-ignored; no `NEXT_PUBLIC_*` secrets | Done |
| Admin | Guarded layout + every action; all admin mutations write `AuditLog` | Tested (audit rows) |
| Open redirects | `safeNext()` only allows same-site relative paths | Tested |
| Payments | No provider wired; promotions activate only on verified, idempotent webhook or audited admin grant | Tested (idempotency) |

## Known gaps / follow-ups
1. CSP nonces instead of `'unsafe-inline'` scripts.
2. Rate limiter is per-node fixed window; fine for one web container, revisit if scaling horizontally.
3. No malware/NSFW image scanning; moderation queue is the control for now.
4. Phone verification for sellers (trust signal) not implemented; `verifiedAt` is only set manually by admins after real verification.
5. Error monitoring (Sentry/GlitchTip) not wired — needs a DSN.
