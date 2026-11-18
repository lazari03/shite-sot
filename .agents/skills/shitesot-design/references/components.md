# Component specs (`src/ui/`)

All components: tokens only (no hex), `cn()` for class merging, `forwardRef` where they wrap native elements, i18n for any built-in text, and both light/dark verified. Variants via `cva`.

## Button

| Variant | Look |
|---|---|
| `primary` | `bg-primary text-white shadow-primary`, the one red action per screen |
| `secondary` | `bg-surface-sunken text-ink` |
| `glass` | `glass text-ink`, for buttons floating over imagery |
| `ghost` | transparent, `text-ink`, hover/active `bg-ink/5` |
| `danger` | `text-danger bg-danger/10` |

Sizes: `sm h-9 px-3 text-caption`, `md h-11 px-4 text-body` (default), `lg h-13 px-6 text-price`. Radius `rounded-control`, or `rounded-chip` for `pill`. Loading state keeps width and swaps the label for a 3-dot pulse. `active:scale-[0.97]`.

## IconButton

Circle, `size-11` min, `aria-label` required (type-enforced). Variants `glass | ghost | solid`.

## TabBar

Floating glass capsule (see `liquid-glass.md`). 5 items. Center **Shit** is a 56px solid `bg-primary` circle raised `-translate-y-3` with `shadow-primary` and a `+` icon. Active item: filled icon + label + sliding lens pill. Hidden on create flow and when the keyboard is open.

## TopBar

Height `--spacing-topbar` + safe-area. Modes: `large` (30px display title, collapses on scroll), `inline` (17px centered title), `transparent` (over hero image, becomes glass after 8px scroll). Slots: leading (back), title, trailing (≤ 2 icon buttons).

## Sheet (vaul)

`glass-thick rounded-t-sheet`, grabber 36×5 `bg-ink/20` pill, snap points `[0.5, 0.92]` for filters. Header: title (17/600) + close. Footer sticky with primary action. Max height `92dvh`. Focus trap, Esc, swipe down.

## Chip / FilterChip

`rounded-chip h-9 px-3.5 text-caption font-medium`. Off: `bg-surface-sunken`. On: `bg-ink text-canvas`. Over imagery: `glass-thin`. Horizontal scroll row with `snap-x` and fade masks on the edges.

## PriceTag

```tsx
<PriceTag lek={22000} previousLek={25000 /* only when PriceHistory proves a drop */} size="md" />
```
Renders `22 000 L` (`Intl.NumberFormat("sq-AL")`, tabular, 700). With `previousLek`: struck `25 000 L` in `ink-muted` + `−3 000 L` in `text-drop`. Never accepts a previous price that is ≤ the current price (throws in dev).

## Badge

`glass-thin rounded-chip h-6 px-2 text-micro font-semibold uppercase tracking-wide` with a 6px dot in the semantic colour. Kinds: `drop`, `urgent`, `fresh`, `sold`, `reserved`. `sponsored` is NOT a Badge; it's a plain caption label.

## ListingCard

See SKILL.md §3. Props: `listing` (view model from `features/listings/queries.ts`), `priority` (for above-the-fold LCP). The whole card is a `<Link>`; the save button stops propagation.

## ListingGallery (detail)

Full-bleed swipeable (CSS scroll-snap, no heavy carousel lib), 4:5, page dots in a `glass-thin` pill, tap → fullscreen viewer with pinch-zoom. Hero image carries the view-transition name.

## ContactBar (detail)

Sticky bottom glass bar replacing the TabBar on detail pages: price on the left, **Kontakto në WhatsApp** primary button on the right (opens `https://wa.me/<number>?text=<prefilled sq message with title + ref>`). Logs a `ContactClick` via server action before navigating. If the seller hasn't consented to contact, show "Kontakti nuk është i disponueshëm".

## EmptyState

Lucide icon in a 64px `bg-surface-sunken` circle, title (17/600), one line of help, optional single action. Albanian copy that helps: "Asnjë rezultat për 'iphone 13' në Shkodër. Ruaje kërkimin dhe të njoftojmë."

## Skeleton

`bg-surface-sunken animate-pulse rounded-*` matching the real component geometry. Shimmer is off under reduced motion.

## Toast

`sonner` styled with `glass-thick rounded-control`, positioned above the TabBar.

## Form fields

Label above (13/500), input `h-12 rounded-control bg-surface-sunken px-4 text-[16px]`, focus `ring-2 ring-deti-500`, error text `text-danger text-caption` with `aria-describedby`. Price input shows a `L` suffix and live-formats thousands.
