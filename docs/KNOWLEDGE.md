# ShitShpejt — knowledge base (what exists today)

Plain-language overview of everything that is built and running on `main` (last updated 2026-11-25).
For deeper detail see `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`; open work is in `docs/TODO.md`.

---

## 1. What the product is

**ShitShpejt — "Okazionet nuk presin."** A mobile-first Albanian marketplace where every listing has **one fixed price** and is live for **exactly 48 hours**. No auctions, bids or haggling, and no automatic relisting. Albanian by default, English available. Prices in EUR (ALL supported in the data).

## 2. Who can do what

| Role | Can |
|---|---|
| **Visitor** (no account) | Browse, search, filter, open listings, share, report a listing |
| **User / seller** (registered, **email confirmed**) | Everything above + publish listings, save favourites, contact sellers on WhatsApp, manage own listings, edit profile, delete account |
| **Admin** | Everything + moderation queue, reports, users, categories, promotion prices, audit log, system health |
| **AI moderator** (optional, OpenAI) | Approves or rejects new listings automatically (see §5) |

Sellers **must confirm their email** before they can publish (`listing_email_required`). That is why production needs Resend.

## 3. The life of a listing

```
Draft ──submit──► In review ──approve (admin or AI)──► LIVE (48h clock starts) ──► Sold / Expired
                     │
                     └─reject──► Rejected ──fix + resubmit (appeal)──► In review again
```

- **Draft:** saved but not public.
- **In review (`PENDING_REVIEW`):** waiting for an admin or the AI.
- **Live (`ACTIVE`):** public. The 48h clock starts **only at approval**, never earlier.
- **Sold:** the seller marked it sold. They can undo it only while the original 48h are still running.
- **Expired:** the 48h ran out. It disappears from the site immediately, even before the background job tidies the status. There is no relisting; the seller creates a new listing.
- **Rejected:** not approved, with a reason shown to the seller. The seller can edit and resubmit (an appeal). A listing rejected by the AI always goes to a **human** on resubmit.
- **Removed:** taken down by an admin (e.g. after reports).

Hard rules:
- Edits never restart the clock.
- While live, the price can only go **down**.
- Big edits (title, photos, category, condition) send it back to review while the clock keeps running.

## 4. Who reviews listings (moderation)

Controlled by `MODERATION_MODE` in `.env.production`:

| Setting | Behaviour |
|---|---|
| `all` (current production default) | Every listing waits for review |
| `first_n` | A seller's first `MODERATION_TRUST_AFTER` (3) listings are reviewed, then they publish instantly |
| `none` | Everything publishes instantly |

Also:
- Admins can mark a seller **trusted** in `/admin/perdoruesit`; trusted sellers skip manual review.
- **When the AI moderator is on, every submission goes to review first**, and the AI does that review.

## 5. The AI moderator — does it publish by itself?

**Yes.** When it is switched on, it approves and publishes listings with no human involved.

How it works (`src/features/listings/ai-moderation.ts`, run by the worker every minute):
1. It takes the oldest listing waiting for review.
2. It skips (leaves for a human) any listing where:
   - the title or description contains a phone number, email or link;
   - a photo is missing or too large;
   - the category or city is inactive;
   - the listing was previously rejected by the AI (appeals always go to a human).
3. It sends the title, description, category, condition, price and photos to **OpenAI** (model `OPENAI_MODERATION_MODEL`, default `gpt-5.4-mini`) with the review prompt stored in the database (`ModerationPrompt`, key `listing_review_v1`).
4. OpenAI answers one of three things:
   - **approve:** the listing goes **live immediately**, the 48h clock starts, and it is logged in the audit log as "AI moderation".
   - **decline:** the listing is **rejected** (`AI_REVIEW_DECLINED`). The seller can fix it and resubmit; a human then decides.
   - **needs_human_review:** it stays in `/admin/moderimi` for you.
5. Each listing is checked **once**. If the AI skipped it or was unsure, it waits for a human and is never retried.

On approval it also adds a **price rating** when there are at least 3 recent comparable sales (same title, category, condition, currency, sold in the last 90 days, different sellers):
- a score from 0 to 100;
- a "below comparable prices" note.

Both are shown on the listing card. The rating is based only on real sold listings, never invented.

**Switching it on / off** (in `~/shite-sot/.env.production` on the server, then `make deploy`):
```
AI_MODERATION_ENABLED=true        # false = off, listings wait for an admin
OPENAI_API_KEY=sk-...             # platform.openai.com, billing required (paid per review)
OPENAI_MODERATION_MODEL=gpt-5.4-mini
```
`make deploy` asks for the OpenAI key once if it isn't set yet. Check it is running at `/admin/shendeti`: the `listings.ai-moderation` job shows its last run.

## 6. Features by area

**Buyers**
- **Homepage:** a live clock for the deal that ends first, categories, featured (sponsored) deals, deals ending soon, recently published, deals by city.
- **Search** (`/kerko`) and **category pages** (`/kategori/…`): accent-insensitive search (e.g. "celular" finds "çelular"), with filters for city, condition, price range and sort. Condition and sort options come from the database (`DiscoveryOption`).
- **Listing page** (`/p/…`):
  - photo gallery, fixed price, and a countdown to the second;
  - description, seller card, and a price rating where available;
  - **WhatsApp contact**, only if the seller agreed (clicks are counted as traffic, never as sales);
  - save, share, report, related deals.
- **Saved listings** (`/ruajtura`) and **seller profiles** (`/shitesi/…`).

**Sellers**
- **Sell form** (`/shit`): up to 8 photos (auto-rotated, location data stripped, converted to WebP), title, category, city, price, condition, description, an optional approximate area, an optional "new price in shops" with its source, and a WhatsApp opt-in.
- **Dashboard** (`/paneli`): real numbers only (views, contact clicks, saves; live/sold/expired counts). Per listing: publish, edit, mark sold or undo, withdraw, delete draft.
- **Account** (`/llogaria`): profile, photo, WhatsApp consent, language (sq/en), log out, delete account (removes listings and anonymises data).

**Admins** (`/admin`)
- Overview with real metrics and 14 days of activity.
- Moderation queue: approve, reject with reason, remove.
- Reports: dismiss, resolve, or remove the listing.
- Users: ban, verify, trust.
- Categories: add, edit, turn off.
- Promotions: prices, audited free grants.
- Audit log of every admin and AI action.
- Health: database plus each background job's last run.

**Background worker** (every minute or hour): expires listings after 48h, runs the AI moderation, ends promotions, cleans up unused uploads and old rate-limit counters.

**Monetisation (prepared, not live)**: featured listing, category spotlight, homepage spotlight, professional seller plan. Prices are set in admin. **No payment provider is connected**, so no "pay" buttons are shown; promotions only start through an audited admin grant.

## 7. Tech and infrastructure

- **App:** Next.js 16 + React 19 + TypeScript, Tailwind v4 (design copied from `docs/design/prototype-v4.html`), Better Auth (email + password, Google optional), next-intl (sq/en).
- **Database:** PostgreSQL on **Supabase** (`DATABASE_URL`), managed with Prisma 7 migrations.
- **Images:** stored on the server's disk to start (`STORAGE_DRIVER=local`); S3 / Hetzner Object Storage supported.
- **Email:** Resend (`RESEND_API_KEY`), required in production for signup confirmation and password reset.
- **AI:** OpenAI, optional (see §5).
- **Hosting:** one server running Docker. Images: `web` (the site), `worker` (background jobs), `migrate` (database updates). HTTPS via Caddy; if another Caddy already uses ports 80/443 on the server, ShitShpejt plugs into it.
- **Security:** checks on every action, rate limits, upload validation, same-origin checks, CSP, audit log. Details in `docs/SECURITY.md`.

## 8. Deploying and day-to-day commands

| Task | Command |
|---|---|
| Deploy / update the live site (on the server) | `cd ~/shite-sot && git pull && make deploy` |
| See all commands | `make help` |
| Run locally | `make setup && make dev` (+ `make worker`) |
| All checks (lint, types, translations, tests, build) | `make check` |
| Browser tests | `make e2e` |

- **Automatic deploys:** GitHub Actions deploys **production** after CI passes on `main`. This needs the deploy secrets set in GitHub; otherwise use `make deploy`.
- **First `make deploy`** asks for:
  - the domain (Enter = free `<ip>.sslip.io`);
  - an email for HTTPS;
  - the OpenAI key (optional).

  It also requires these in `.env.production`:
  - `DATABASE_URL`: the Supabase connection string;
  - `RESEND_API_KEY`: the email key.
- **Make yourself admin** (after registering on the site):
  ```bash
  cd /opt/shitshpejt && TAG=$(cat .current_tag) docker compose -f compose.prod.yaml run --rm migrate admin-grant you@example.com
  ```

## 9. Known gaps (see `docs/TODO.md`)

- No payment provider yet, so promotions can only be granted by an admin.
- Terms of use and privacy pages are not written yet (needed before a real launch).
- No error monitoring (Sentry/GlitchTip) connected.
- The AI never re-checks a listing it skipped, so check `/admin/moderimi` regularly.
- No automatic database backups on the server. Use Supabase's backups and/or `make server-backup`.
