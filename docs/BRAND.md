# ShiteSot — Brand

**Tagline:** _Shite shpejt. Gjej lirë._ (Sell fast. Find cheap.)

**Personality:** fast, honest, local, modern. A confident Albanian product with a European finish, not a WordPress classifieds theme. It should feel like a native iOS app that happens to run in the browser.

## Colour

The palette is built on Albanian flag red (**Kuq**), a warm stone neutral (**Gur**), and an Adriatic accent (**Deti**). Red is the brand and primary-action colour. Status colours are kept separate from brand red, so "urgent" and "error" never look like the logo.

### Kuq (brand red), primary actions, logo, Sell button

| Token | Hex | Use |
|---|---|---|
| `kuq-50` | `#FEF2F2` | tinted backgrounds |
| `kuq-100` | `#FDE3E3` | chip bg |
| `kuq-200` | `#FBC9CA` | |
| `kuq-300` | `#F79FA1` | |
| `kuq-400` | `#F0666A` | dark-mode primary |
| **`kuq-500`** | **`#E41E20`** | **brand / primary (5.8:1 on white)** |
| `kuq-600` | `#C8161A` | pressed, danger text |
| `kuq-700` | `#A31216` | |
| `kuq-800` | `#861418` | |
| `kuq-900` | `#6F161A` | |
| `kuq-950` | `#3D0709` | |

### Gur (warm neutral), text, surfaces, borders

| Token | Hex | Use |
|---|---|---|
| `gur-0` | `#FFFFFF` | cards (light) |
| `gur-25` | `#FBFAF9` | app background (light) |
| `gur-50` | `#F5F4F2` | sunken surfaces |
| `gur-100` | `#ECEAE7` | dividers |
| `gur-200` | `#DAD7D3` | borders |
| `gur-300` | `#BDB9B4` | disabled |
| `gur-400` | `#8F8A84` | placeholder |
| `gur-500` | `#6B6661` | secondary text |
| `gur-600` | `#4F4B47` | |
| `gur-700` | `#3A3734` | |
| `gur-800` | `#252321` | cards (dark) |
| `gur-900` | `#161514` | app background (dark) |
| `gur-950` | `#0C0B0B` | primary text (light), prices |

### Deti (Adriatic), links, focus rings, info

| Token | Hex |
|---|---|
| `deti-400` | `#4D94FF` |
| `deti-500` | `#0A6CFF` |
| `deti-600` | `#0056D6` |

### Semantic (marketplace meaning)

| Token | Hex | Meaning | Albanian label |
|---|---|---|---|
| `drop` | `#0F9D58` | genuine price reduction (good for buyer) | **Ulje çmimi** |
| `urgent` | `#FF7A00` | seller-set urgent sale | **Urgjent** / _Shitet brenda 48 orëve_ |
| `fresh` | `#0A6CFF` | listed in last 24h | **E re** |
| `sold` | `#6B6661` | sold / reserved | **Shitur** / **Rezervuar** |
| `sponsored` | `gur-950` on glass | paid placement, always labelled, never disguised | **Sponsorizuar** |
| `success` | `#12B76A` | | |
| `warning` | `#F5A524` | | |
| `danger` | `kuq-600` | | |

**Rules**
- Exactly **one** red primary action per screen (usually *Shit* / *Publiko*).
- Prices are always `gur-950` (dark: `gur-0`), bold, tabular numerals. Never red. Red prices read as errors.
- A struck-through old price appears **only** next to a `drop` badge backed by `PriceHistory`.
- Dark mode is first-class, not an afterthought.

## Typography

| Role | Family | Why |
|---|---|---|
| Display / headings / logo wordmark | **Bricolage Grotesque** (variable, 600–800) | characterful, warm, distinctly not "default SaaS"; full Latin Extended (ë, ç) |
| UI / body | **Geist** (variable, 400–600) | crisp app-like UI face, excellent tabular numerals for prices |
| Numerals / prices | Geist with `font-variant-numeric: tabular-nums` | prices align in lists |

Both load via `next/font/google` with `subsets: ["latin", "latin-ext"]` and `display: "swap"`. Always test strings with **ë, Ë, ç, Ç**.

**Scale** (mobile-first, rem): `11 / 13 / 15 (body) / 17 / 20 / 24 / 30 / 38`. Body is 15–17px on mobile. Line-height 1.45 for body, 1.1 for display. Headings use `letter-spacing: -0.02em`.

## Logo

Wordmark **ShiteSot** in Bricolage Grotesque 800, `-0.03em` tracking. "Shite" in `gur-950`, "Sot" in `kuq-500`. App icon: white bold **S** on `kuq-500`, rounded-square (iOS mask safe). Do **not** use the double-headed eagle; it's a state symbol.

## Iconography

**Lucide** (`lucide-react`), 1.75px stroke, 20/24px. Filled variants only for active tab states.

## Voice (Albanian first)

- Short, direct, friendly. Use second person singular (**ti**): _"Shit telefonin në 2 minuta."_
- Never hype or fake urgency. Avoid _"Vetëm sot!!!"_ unless it's literally true.
- Numbers: `22 000 L` / `22 000 lekë` using a thin space as the thousands separator (`Intl.NumberFormat("sq-AL")`).
- Key UI strings: **Shit** (Sell), **Kërko** (Search), **Ruajtur** (Saved), **Profili**, **Kryefaqja** (Home), **Publiko**, **Kontakto në WhatsApp**, **Shëno si të shitur**.
