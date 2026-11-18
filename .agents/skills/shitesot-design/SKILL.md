---
name: shitesot-design
description: ShiteSot design system. Use for ANY UI work in this repo, including pages, components, layout, styling, Tailwind classes, colours, fonts, animations, liquid glass effects, bottom tab bar, sheets, product cards, PWA/app-feel behaviour, and dark mode. Load before writing or changing any .tsx that renders UI or any CSS.
---

# ShiteSot Design System

ShiteSot should feel like a **native iOS app running in the browser**: liquid-glass chrome floating over full-bleed product photography, a bottom tab bar, sheets instead of pages, instant feedback, and no visible "website" seams. Brand reference: `docs/BRAND.md`.

## 0. Setup (once)

1. Copy `assets/tokens.css` into `src/styles/globals.css` (after `@import "tailwindcss";`). It defines every colour, radius, shadow, motion and glass token as Tailwind v4 `@theme` variables plus `glass-*` utilities.
2. Fonts in `src/app/[locale]/layout.tsx`:
   ```ts
   import { Bricolage_Grotesque, Geist } from "next/font/google";
   const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-bricolage", display: "swap" });
   const sans = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", display: "swap" });
   // <html lang={locale} className={`${display.variable} ${sans.variable}`}>
   ```
3. Viewport: `export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#FBFAF9" }, { media: "(prefers-color-scheme: dark)", color: "#161514" }] }`.

## 1. The three surface levels

Every pixel belongs to exactly one level. **Do not mix them up.**

| Level | What | Material | Tailwind |
|---|---|---|---|
| **Canvas** | app background, content scroll area | solid `gur-25` / dark `gur-900` | `bg-canvas` |
| **Content** | product cards, forms, text blocks, listing detail body | solid, opaque, crisp | `bg-surface rounded-card shadow-card` |
| **Chrome** | TabBar, top bar, floating action buttons, filter chips over images, sheets, toasts, menus | **liquid glass** | `glass`, `glass-thick`, `glass-thin` |

**Glass is for chrome only.** Never put body text, prices in lists, or forms on glass. Glass over glass is only allowed for one nested control (e.g. a button inside a sheet header). Max **3 simultaneous blurred layers** on screen, for performance.

Full recipe, fallbacks, and the optional SVG refraction layer: `references/liquid-glass.md`.

## 2. Layout & app shell

- **Mobile-first.** Design at 390px. Breakpoints: `sm 640` (large phones), `md 768` (tablet: 2-col grid → 3), `lg 1024` (desktop: side rail replaces TabBar, max content width 1200px).
- **App shell** (`src/app/[locale]/(shell)/layout.tsx`): top bar (glass, collapses on scroll) + scroll container + **bottom TabBar** (glass, floating, `bottom: max(12px, env(safe-area-inset-bottom))`).
- **TabBar items (exact order):** Kryefaqja · Kërko · **Shit** (center, raised, `bg-kuq-500` solid, not glass) · Ruajtur · Profili.
- **Safe areas everywhere:** `pt-[env(safe-area-inset-top)]`, `pb-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))]` on the scroll container.
- Use `100dvh`, never `100vh`.
- Desktop ≥ `lg`: TabBar becomes a glass left rail. Content stays mobile-shaped (cards don't stretch beyond 280px).

## 3. Product card (the most important component)

- Image 4:5, `rounded-card`, `object-cover`, blurhash placeholder, `sizes="(max-width:768px) 50vw, 25vw"`.
- Badges **overlaid on the image** in a `glass-thin` pill, top-left: `Ulje çmimi` (drop) / `Urgjent` / `E re`. Max 1 badge, priority: urgent > drop > new.
- Save (heart) button: top-right, `glass-thin` circle, 40px, optimistic toggle.
- Below image (solid): price (`text-price` = 17px/700, tabular), old price struck through **only if drop**, title (2 lines, 15px), city · relative time (`13px gur-500`).
- Sponsored: small `Sponsorizuar` label below meta, never on the image, never styled like a status badge.
- Grid: `grid-cols-2 gap-3 px-4` mobile, `md:grid-cols-3`, `lg:grid-cols-4`.

Component specs for Button, Sheet, TopBar, Chip, PriceTag, Badge, EmptyState, Skeleton: `references/components.md`.

## 4. App feel (non-negotiable)

Read `references/app-feel.md`. Summary:
- **Sheets, not pages**, for filters, sort, share, contact, confirmations (use `vaul` drawer). Pages for listing detail, create flow, and profile.
- **View Transitions** between card → detail (shared image element) using React `<ViewTransition>` / `experimental.viewTransition`.
- **Optimistic UI** for save, mark-as-sold, price change (`useOptimistic`).
- **Skeletons** shaped like the real content, never spinners for page loads. `loading.tsx` per route segment.
- **Press feedback** on every tappable thing: `active:scale-[0.97] transition-transform duration-fast`.
- No hover-only affordances. `-webkit-tap-highlight-color: transparent`. `touch-action: manipulation`.
- `overscroll-behavior-y: contain` on inner scrollers; pull-to-refresh only on Home.
- Haptics: `navigator.vibrate?.(8)` on save/publish where supported. Never required.
- PWA: installable, standalone, offline fallback page, app icons, iOS splash screens.

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | press, toggle |
| `--duration-base` | 220ms | chips, fades |
| `--duration-slow` | 360ms | sheets, view transitions |
| `--ease-out-soft` | `cubic-bezier(.2,.8,.2,1)` | default |
| `--ease-spring` | `linear(...)` spring in tokens | sheets, tab indicator |

Animate only `transform` and `opacity`. Respect `prefers-reduced-motion: reduce` (tokens collapse durations to 0). No decorative looping animations, no parallax, no confetti.

## 6. Colour usage cheatsheet

- One `kuq-500` primary action per screen.
- Prices: `text-ink` (gur-950 / dark gur-0), never red.
- Price drop: `text-drop` + `bg-drop/12` pill. Urgent: `text-urgent` + `bg-urgent/12`.
- Links / focus: `deti-500`. Focus ring: `focus-visible:ring-2 ring-deti-500 ring-offset-2 ring-offset-canvas`.
- Dark mode via `prefers-color-scheme` + `.dark` class override; every component must be checked in both.

## 7. Accessibility gates

- Touch targets ≥ 44×44 (`min-h-11 min-w-11`).
- Text contrast ≥ 4.5:1, **including text on glass**. Glass tokens are tuned for this. If a background image is busy, use `glass-thick`.
- `prefers-reduced-transparency: reduce` → glass becomes solid (handled in tokens).
- Every icon-only button has `aria-label` (i18n key).
- Sheets trap focus and close on Esc / swipe down / backdrop.

## 8. Don'ts

- ❌ Gradients as decoration, glow, neon, glassmorphism on content cards
- ❌ Spinners for page loads, layout shift from images (always width/height or aspect-ratio)
- ❌ Fake countdowns, fake "X people are viewing", fake discount strikes
- ❌ Hardcoded hex values in components; use tokens
- ❌ Hardcoded English strings
- ❌ `100vh`, hover-only menus, tiny tap targets, modal dialogs for things a sheet can do

## 9. Before you say "done"

- [ ] Checked at 390×844 light **and** dark
- [ ] Checked at 1280 desktop
- [ ] Albanian strings with ë/ç render correctly and don't overflow
- [ ] No CLS (Lighthouse mobile), LCP image has `priority`
- [ ] Reduced motion + reduced transparency verified
- [ ] Keyboard navigation works
