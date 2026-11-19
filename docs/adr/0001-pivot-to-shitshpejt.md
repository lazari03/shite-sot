# ADR 0001 — Pivot from ShiteSot to ShitShpejt (48-hour flash marketplace)

**Date:** 2026-11-19 · **Status:** accepted

## Context
The repo was scaffolded for *ShiteSot* (red brand, ALL currency, open-ended listings with price-drop badges, liquid-glass UI). On 2026-11-19 the owner supplied a new brief (`docs/MASTER_PROMPT.md`) and an HTML prototype (`docs/design/prototype-v4.html`) for **ShitShpejt — "Okazionet nuk presin."**: fixed-price listings that live exactly 48 hours, no auctions or haggling, EUR first.

## Decision
- The new brief is the product source of truth. The old one is kept in `docs/archive/` for history only.
- The prototype is the visual source of truth (forest-green ink, lime accent, paper neutrals, small radii, crisp borders, Bricolage Grotesque + DM Sans). The liquid-glass system is retired; blur is used only on sticky chrome.
- Engineering conventions from `AGENTS.md` are kept (Next.js App Router, Prisma/Postgres, Better Auth, pg-boss, feature folders, Zod, next-intl, Docker + Caddy on Hetzner).
- Money: integer **minor units** with a `currency` column (`EUR` cents; `ALL` has exponent 0). Replaces "Int lek".
- Listing states follow the new brief (`DRAFT, PENDING_REVIEW, ACTIVE, SOLD, EXPIRED, REJECTED, REMOVED`; no `RESERVED`).
- Price-drop badges, "urgent sale" and saved-search alerts from the old spec are **not** part of this MVP. A seller-stated reference price may be shown, labelled as the seller's claim with its source, never as a percentage discount.

## Consequences
- Repo name stays `shite-sot`; product name/brand is ShitShpejt.
- `AGENTS.md`, `docs/BRAND.md`, `docs/ARCHITECTURE.md` and the design skill were rewritten to match.
- Old ShiteSot features can return later as separate ADRs if the product needs them.
