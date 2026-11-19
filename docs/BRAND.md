# ShitShpejt — Brand

**Tagline:** _Okazionet nuk presin._ (Deals don't wait.)

**Personality:** fast, honest, local, confident. A sharp Albanian product, not a classifieds theme. Urgency comes from the real 48-hour clock, never from hype.

Visual source of truth: `docs/design/prototype-v4.html`. Tokens live in `src/styles/globals.css` (`@theme`).

## Colour

| Token | Hex | Use |
|---|---|---|
| `ink` | `#14231b` | primary text, hero background, dark buttons, prices |
| `ink-2` | `#1f3328` | hero clock panel, hover on dark |
| `paper` | `#f4f5ef` | app background |
| `paper-2` | `#e7eae1` | hover/ghost, sunken |
| `card` | `#ffffff` | cards, forms |
| `line` | `#dde2d6` | 1px borders |
| `line-strong` | `#98a395` | hovered borders |
| `muted` | `#646e63` | secondary text |
| `lime` | `#c6f24e` | the one bright accent: primary CTA (*Shit diçka*, *Shkruaj në WhatsApp*), clock digits on ink, "I ri" tag |
| `lime-hover` | `#b5e43a` | |
| `lime-deep` | `#5f8a00` | logo "shpejt", focus ring, success ticks (AA on paper) |
| `clay` | `#dc4f28` | urgency (< 6 h left), saved heart, errors, live dot |
| `sage` / `sage-ink` | `#e3f2b8` / `#3c5a00` | positive notes, "Çmim fiks" pill, how-it-works band |

**Rules**
- Lime is an accent, not a background for large areas (except the primary button). Never use lime text on paper (contrast).
- Prices: `ink`, Bricolage 700, tabular numerals, never coloured.
- Urgency escalates only with the real deadline: ink fuse → clay fuse + clay time under 6 h. No blinking (the hero's live dot is the single, motion-reduced exception).
- No percentage-discount badges. A seller-stated new price is plain muted text with its source.
- "Sponsorizuar" is an ink tag on the photo, always.
- No gradients (the logo's conic mark is the exception), no glow, minimal shadows (drawer only).

## Shape & spacing
Radii: `7px` (buttons, inputs) · `12px` (cards, panels) · `20px` (hero, big panels). Borders 1px `line`. Content max-width 1320px, gutters 16px mobile / 32px desktop. Touch targets ≥ 44px.

## Typography

| Role | Family |
|---|---|
| Display, headings, prices, clock | **Bricolage Grotesque** 700–800, tracking −0.03 to −0.05em |
| UI / body | **DM Sans** 400–700, 15px body (16px in inputs to avoid iOS zoom) |

Loaded via `next/font/google` with `latin-ext` (ë, ç).

## Logo
Wordmark `shit` (ink) + `shpejt` (lime-deep), Bricolage 800, −0.045em, preceded by the conic "fuse" mark (70% lime, 30% ink, ink ring). App icon: the mark on ink.

## Voice (Albanian first)
Short, direct, second person singular (*ti*). Honest urgency only: "Mbaron për 5h 17m" yes, "Vetëm sot!!!" no. Key strings: **Shit diçka**, **Kërko**, **Të ruajtura**, **Shkruaj në WhatsApp**, **Shëno si të shitur**, **Çmim fiks**, **Mbarojnë së shpejti**, **Skadoi**, **Shitur**.
