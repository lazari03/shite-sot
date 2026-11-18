# Liquid Glass: implementation guide

Goal: Apple-style "Liquid Glass" chrome on the web. It should be translucent, lensing and specular, and still fast on a mid-range Android phone in Tirana on 4G.

## Anatomy (what the `glass` utility does)

1. **Tint:** semi-opaque surface colour (`--glass-tint`) so text contrast holds over any photo.
2. **Backdrop:** `blur(22px) saturate(185%)`. Saturation boost is what makes it look like glass, not frosted plastic.
3. **Specular top edge:** `inset 0 1px 0 var(--glass-edge)` catches "light" from above.
4. **Inner shade:** `inset 0 -1px 0 var(--glass-shade)` gives thickness at the bottom.
5. **Refracting rim:** gradient 1px border via `::before` mask. Bright at the corners, dim at the sides.
6. **Float shadow:** soft, wide drop shadow separates it from content.

Variants: `glass-thin` (badges, chips over images), `glass` (TabBar, top bar, FABs), `glass-thick` (sheets, menus, anything with paragraphs).

## Usage

```tsx
// src/ui/glass.tsx
import { cn } from "@/lib/cn";
type Props = React.HTMLAttributes<HTMLDivElement> & { variant?: "thin" | "regular" | "thick"; as?: React.ElementType };
export function Glass({ variant = "regular", as: Tag = "div", className, ...rest }: Props) {
  const v = variant === "thin" ? "glass-thin" : variant === "thick" ? "glass-thick" : "glass";
  return <Tag className={cn(v, className)} {...rest} />;
}
```

```tsx
// TabBar: floating capsule
<nav aria-label={t("nav.main")}
  className="glass fixed inset-x-3 z-50 mx-auto flex h-tabbar max-w-md items-center justify-around rounded-bar px-2"
  style={{ bottom: "max(12px, env(safe-area-inset-bottom))" }}>
  …
</nav>
```

## Optional: true refraction (progressive enhancement)

Chromium supports SVG filters in `backdrop-filter`, which gives real lens distortion at the edges. Safari and Firefox ignore it, so the base `glass` remains the experience there. Use **only** on the TabBar and the top bar, never on lists.

```tsx
// Render once in root layout
<svg width="0" height="0" className="absolute" aria-hidden>
  <filter id="lg-refract" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
    <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
    <feDisplacementMap in="SourceGraphic" in2="soft" scale="18" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```
```css
@supports (backdrop-filter: url(#lg-refract)) {
  .glass-refract { backdrop-filter: url(#lg-refract) blur(18px) saturate(185%); }
}
```
Gate behind a `useSupportsRefraction()` check plus `navigator.hardwareConcurrency >= 6`. Measure: if INP regresses by more than 20ms on a Moto G-class device, turn it off.

## Interaction states

- **Press:** `active:scale-[0.97]` and slightly raise the tint: `active:[--glass-tint:rgb(255_255_255/0.7)]`.
- **Active tab:** a glass "lens" pill slides under the active icon (`layoutId`-style FLIP with CSS transform + `--ease-spring`). Icon switches to filled. Label is shown.
- **Scroll-aware top bar:** transparent at `scrollY=0` over hero images, transitions to `glass` after 8px. Title shrinks from 30px to 17px.

## Performance rules

- Max **3 blurred layers** visible at once (TabBar + top bar + one sheet/chip row).
- Never animate `backdrop-filter` values; animate `opacity` and `transform` of the glass element instead.
- Never put glass inside a scrolling list (one per card = jank). Card badges use `glass-thin` only when there are 20 or fewer cards in the viewport; otherwise fall back to solid `bg-surface/90`.
- Add `will-change: transform` only during animation.
- Test on a real low-end Android device or Chrome DevTools at 4× CPU throttle.

## Contrast

Text on glass must reach 4.5:1 over **white, black and a busy photo**. The tint alphas in `tokens.css` are tuned for that with `ink` text. If you lower an alpha, re-verify. Busy imagery → `glass-thick`.
