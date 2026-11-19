---
name: shitesot-design
description: ShitShpejt design system (prototype-derived: forest-green ink, lime accent, paper neutrals, small radii, crisp borders). Use for ANY UI work in this repo — pages, components, layout, styling, Tailwind classes, colours, fonts, countdowns, product cards, mobile shell (tab bar, drawer, sticky action bar), PWA behaviour. Load before writing or changing any .tsx that renders UI or any CSS.
---

# ShitShpejt design system

**Source of truth:** `docs/design/prototype-v4.html` (open it, it is the spec) → translated into `src/styles/globals.css` (`@theme` tokens + a few component classes) and `src/ui/`. Brand rules: `docs/BRAND.md`. The old liquid-glass system is retired (ADR 0001).

## Tokens (Tailwind v4 `@theme`)
Colours: `ink`, `ink-2`, `paper`, `paper-2`, `card`, `line`, `line-strong`, `muted`, `muted-2`, `lime`, `lime-hover`, `lime-deep`, `clay`, `clay-soft`, `sage`, `sage-ink`, `placeholder` → use as `bg-ink`, `text-muted`, `border-line`… Radii: `var(--radius-sm|md|lg)` = 7/12/20px. Fonts: `font-display` (Bricolage Grotesque) for headings/prices/clock, `font-sans` (DM Sans) for UI. Breakpoint `md` = 701px is the mobile-shell switch (prototype's 700px). No raw hex in components except the few prototype tints already used (`#4d5a48`, `#bfcbc0`, `#a9b8ab`, `#fff3cf`).

## Component classes (globals.css)
`wrap` · `btn` + `btn-lime|btn-ink|btn-line|btn-ghost|btn-danger` + `btn-lg|btn-sm` · `iconbtn` · `chip` (`aria-current="page"`/`aria-pressed` = selected) · `card`, `card-link` (whole-card link via `::after`), `tag`, `tag-ink` · `fuse` (countdown bar; urgency via `data-urgency`) · `field`, `input`, `hint`, `error`, `check` · `panel` · `actionbar` (fixed bottom bar on mobile) · `h-display`, `price` · `empty` · `table` · `status status-<LISTING_STATUS>` · `scroll-x`.

## Primitives (`src/ui/`)
`Shell` (header: menu/back + logo/title + search + desktop actions; optional mobile `TabBar`; `actionbar` padding) · `ListingCard` + `CardGrid` · `Countdown` (`card` | `detail` | `inline`) and `HeroClock`, both on the shared ticker in `clock.ts` · `SaveButton` (optimistic) · `ShareButton` · `Price` · `SectionHead`, `EmptyState` · `Pagination` · `Drawer` · `BackButton` · `Logo`. Check here before creating anything new.

## Rules
- **Mobile first at 390×844**, then 1280+. Mobile shell = sticky header (logo + full-width search on home; back + title elsewhere), 5-tab bottom bar (Kreu · Kërko · **Shit** lime pill · Të ruajtura · Llogaria) on top-level pages, fixed `actionbar` on detail/sell pages.
- Server Components by default; client only for interaction (countdown, save, gallery, forms, drawer).
- Cards: photo 4:3 on `placeholder`, one tag max (Sponsorizuar > Shitur > I ri), heart top-right (44px), title 2 lines, big price, city (+ condition ≥ md), fuse + time.
- Countdown: never compute from `Date.now()` during SSR — pass `serverNow` from the server; the client store takes over after hydration. Coarse `36h 20m` on cards, `HH:MM:SS` on detail/hero. Clay styling under 6 h, no blinking.
- Blur only on sticky chrome (header, tab bar, action bars), always with a solid fallback (`prefers-reduced-transparency`).
- Never: big radii, gradients, glows, heavy shadows, % discount badges, fake counters, SaaS-dashboard hero.
- Every string through next-intl (`messages/sq.json` first, then `en.json`); run `pnpm i18n:check`.
- A11y: semantic landmarks, `aria-label` on icon buttons, `role="timer"` on clocks, 44px targets, visible focus (lime-deep outline), `prefers-reduced-motion` respected.
- Don't render buttons for things that aren't wired.

## Done
Screenshot at 390×844 and 1366 desktop (Playwright), no console errors, `pnpm lint && pnpm typecheck && pnpm i18n:check` pass.
