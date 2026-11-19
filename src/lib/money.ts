export type CurrencyCode = "EUR" | "ALL";

/** Minor-unit exponent per currency. ALL has no subunit in practice. */
export const CURRENCY_EXPONENT: Record<CurrencyCode, number> = { EUR: 2, ALL: 0 };

/** Max allowed price, in major units, to stop typos like 99999999. */
export const MAX_PRICE_MAJOR: Record<CurrencyCode, number> = { EUR: 1_000_000, ALL: 100_000_000 };

/**
 * Parse user input like "399", "399,50", "1.299,99" or "1299.99" into integer minor units.
 * Returns null for anything that isn't a clean positive amount. No floats are used.
 */
export function parsePriceToMinor(input: string, currency: CurrencyCode): number | null {
  const raw = input.trim().replace(/\s| | /g, "").replace(/€|lek[ëe]?|L$/gi, "");
  if (!raw) return null;
  // Decide decimal separator: the last of [.,] followed by 1–2 digits at the end.
  const m = raw.match(/^(\d{1,3}(?:[.,]\d{3})*|\d+)(?:([.,])(\d{1,2}))?$/);
  if (!m) return null;
  const intPart = m[1]!.replace(/[.,]/g, "");
  const frac = m[3] ?? "";
  const exp = CURRENCY_EXPONENT[currency];
  if (frac && exp === 0) return null;
  const fracPadded = (frac + "00").slice(0, exp);
  const minor = Number(intPart + fracPadded);
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  if (minor > MAX_PRICE_MAJOR[currency] * 10 ** exp) return null;
  return minor;
}

export function formatPrice(minor: number, currency: CurrencyCode, locale = "sq-AL"): string {
  const exp = CURRENCY_EXPONENT[currency];
  const hasFraction = exp > 0 && minor % 10 ** exp !== 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? exp : 0,
    maximumFractionDigits: hasFraction ? exp : 0,
  }).format(minor / 10 ** exp);
}

/** Major-unit string for form inputs (e.g. 39950 EUR -> "399,50"). */
export function minorToInput(minor: number, currency: CurrencyCode): string {
  const exp = CURRENCY_EXPONENT[currency];
  if (exp === 0) return String(minor);
  const major = Math.floor(minor / 10 ** exp);
  const frac = minor % 10 ** exp;
  return frac ? `${major},${String(frac).padStart(exp, "0")}` : String(major);
}
