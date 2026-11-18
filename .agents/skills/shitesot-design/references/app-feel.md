# App feel in the browser

The test: put the PWA on an iPhone home screen next to Instagram and Vinted. Nobody should be able to tell it's a website.

## PWA

- `src/app/manifest.ts`: `name: "ShiteSot"`, `short_name: "ShiteSot"`, `display: "standalone"`, `start_url: "/?source=pwa"`, `background_color: "#FBFAF9"`, `theme_color: "#E41E20"`, `lang: "sq"`, icons 192/512 + maskable, `shortcuts`: Shit (`/shit`), Kërko (`/kerko`), Ruajtur (`/ruajtur`).
- **Serwist** (`@serwist/next`): precache app shell + fonts, `StaleWhileRevalidate` for listing images, `NetworkFirst` for HTML, offline fallback route `/offline` (Albanian copy, shows saved listings from cache).
- iOS: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, apple-touch-icon 180, splash images via `appleWebApp.startupImage`.
- Install prompt: capture `beforeinstallprompt` and show a dismissible glass banner **after** the user's 2nd visit or 1st save. Never on first paint. iOS gets a small "Shto në ekranin kryesor" tip sheet with the share-icon illustration.
- Web Push (phase 2) via VAPID. Ask only after the user creates a saved search.

## Navigation model

| Pattern | Use for |
|---|---|
| Tab (bottom bar) | Kryefaqja, Kërko, Shit, Ruajtur, Profili. Preserve each tab's scroll position. |
| Push (new page with back) | Listing detail, seller profile, category, settings |
| Sheet (`vaul` Drawer) | Filters, sort, share, contact seller, report, confirm destructive, quick edit price |
| Full-screen flow | Create listing (stepper, no tab bar, close ✕ top-left, progress top) |

- Back button: top-left glass circle, `router.back()` with fallback to the parent route when there's no history (deep links from WhatsApp).
- Preserve scroll on back. Next.js App Router does this. Don't break it with client-side remounts.
- Use `<Link prefetch>` on cards in the viewport.

## Transitions

- Enable view transitions (`experimental.viewTransition: true` / React `<ViewTransition>`).
- Card → Detail: shared element `view-transition-name: listing-img-${id}` on card image and detail hero.
- Tab switches: no slide (native tabs don't slide). Cross-fade 120ms.
- Push: detail slides in from the right 360ms `--ease-out-soft`. Back reverses.
- Sheets: spring from the bottom, backdrop fades to `rgb(12 11 11 / .32)`.

## Feedback & perceived speed

- `useOptimistic` for save/unsave, mark sold, reserve, price change. Roll back with a toast on failure.
- Toasts (`sonner`), glass, bottom above TabBar, 3s, swipe to dismiss.
- Skeletons in `loading.tsx` per segment, matching the real grid (2-col cards with 4:5 image blocks).
- Image upload in create flow: show local previews instantly (object URLs), upload in parallel in the background, compress client-side to ≤ 2048px before upload.
- Forms: inline validation on blur, Albanian error messages, keep the primary button sticky above the keyboard (`position: sticky; bottom: env(keyboard-inset-height, 0)` + `interactive-widget=resizes-content` in viewport meta).

## Native-like details

- `user-select: none` on chrome (tab bar, buttons), never on content.
- Inputs ≥ 16px font-size so iOS doesn't zoom.
- `inputmode="numeric"` + `pattern="[0-9]*"` for price, `type="tel"` for WhatsApp.
- `enterkeyhint` set on every input (`search`, `next`, `done`).
- Native share: `navigator.share({ title, text, url })` with a fallback sheet (WhatsApp, Messenger, Facebook, copy link).
- Camera: `<input type="file" accept="image/*" capture="environment" multiple>` as the first step of the Sell flow.
- Long-press on card (≥ 450ms) → quick actions sheet (save, share, report). Optional, but nice.
- Respect the system's dark mode instantly; no flash (inline theme script in `<head>`).

## Performance budgets (mobile, 4G, mid-range Android)

| Metric | Budget |
|---|---|
| LCP | < 2.0s |
| INP | < 150ms |
| CLS | < 0.05 |
| JS on Home (gz) | < 120KB |
| Listing page HTML TTFB (cached) | < 200ms |

Ship server components by default; `"use client"` is a cost you justify.
